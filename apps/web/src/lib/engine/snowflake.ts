import crypto from "node:crypto";
import type { ApiKeyPrefix, SnowflakePrefix } from "@/types";

const BLOUME_EPOCH = 1735689600000n; // 2025-01-01T00:00:00.000Z

export class SnowflakeGenerator {
  private readonly workerId: bigint;
  private sequence = 0n;
  private lastTimestamp = -1n;

  constructor(workerId?: number) {
    const envWorker = Number(process.env.WORKER_ID ?? 1);
    const resolved =
      typeof workerId === "number" && Number.isFinite(workerId)
        ? Math.trunc(workerId)
        : Number.isFinite(envWorker)
          ? Math.trunc(envWorker)
          : 1;
    this.workerId = BigInt(Math.max(0, Math.min(1023, resolved)));
  }

  public nextBigInt(): bigint {
    let timestamp = BigInt(Date.now());
    if (timestamp < this.lastTimestamp) {
      timestamp = this.lastTimestamp;
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & 4095n;
      if (this.sequence === 0n) {
        while (timestamp <= this.lastTimestamp) {
          timestamp = BigInt(Date.now());
        }
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;
    const elapsed = timestamp - BLOUME_EPOCH;
    return (elapsed << 22n) | (this.workerId << 12n) | this.sequence;
  }

  public nextId(prefix: SnowflakePrefix): string {
    return `${prefix}_${this.nextBigInt().toString(10)}`;
  }
}

export const snowflake = new SnowflakeGenerator();

export function generateSnowflakeId(prefix: SnowflakePrefix): string {
  return snowflake.nextId(prefix);
}

const ALPHANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateApiKey(prefix: ApiKeyPrefix): string {
  let token = "";
  for (let i = 0; i < 32; i += 1) {
    token += ALPHANUM[crypto.randomInt(0, ALPHANUM.length)];
  }
  return `${prefix}_${token}`;
}

export function hashSecretKey(secretKey: string): string {
  return crypto.scryptSync(secretKey, "bloumeid-sec-kdf-v1", 32).toString("hex");
}

export function maskSecretKey(secretKey: string): string {
  if (secretKey.length <= 14) return "bid_sec_***";
  return `${secretKey.slice(0, 12)}...${secretKey.slice(-4)}`;
}

/**
 * Constant-time string comparison using crypto.timingSafeEqual on equal-length SHA-256 buffers
 * or equal-length raw buffers so length differences never throw or leak timing details.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  const hashA = crypto.createHash("sha256").update(bufA).digest();
  const hashB = crypto.createHash("sha256").update(bufB).digest();
  const hashesMatch = crypto.timingSafeEqual(hashA, hashB);
  return hashesMatch && bufA.length === bufB.length;
}

export function signHmacSha256(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function verifyHmacSha256(secret: string, payload: string, signatureHex: string): boolean {
  const expected = signHmacSha256(secret, payload);
  return constantTimeEqual(expected, signatureHex);
}

function getMasterWrapKeyBytes(masterKey = process.env.ADMIN_MASTER_KEY ?? "bloumeid_dev_master_key_2026"): Buffer {
  return crypto.createHash("sha256").update(`bloumeid-site-key-wrap-v1:${masterKey.trim()}`, "utf8").digest();
}

export function wrapSiteSecretKey(plainSecretKey: string, masterKey?: string): string {
  const key = getMasterWrapKeyBytes(masterKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainSecretKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc.${iv.toString("base64url")}.${encrypted.toString("base64url")}.${tag.toString("base64url")}`;
}

export function unwrapSiteSecretKey(
  wrapped: string | null | undefined,
  masterKey?: string
): string | null {
  if (!wrapped || typeof wrapped !== "string") return null;
  const parts = wrapped.split(".");
  if (parts.length !== 4 || parts[0] !== "enc") return null;
  const [, ivB64, cipherB64, tagB64] = parts;
  if (!ivB64 || !cipherB64 || !tagB64) return null;
  try {
    const key = getMasterWrapKeyBytes(masterKey);
    const iv = Buffer.from(ivB64, "base64url");
    const ciphertext = Buffer.from(cipherB64, "base64url");
    const authTag = Buffer.from(tagB64, "base64url");
    if (iv.length !== 12 || authTag.length !== 16) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return plain.startsWith("bid_sec_") ? plain : null;
  } catch {
    return null;
  }
}

export function sealVerificationResult(secretKey: string, payload: unknown): string {
  const key = crypto
    .createHash("sha256")
    .update(`bloumeid-seal-v1:${secretKey}`, "utf8")
    .digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encoded = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(encoded), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptTransportEnvelopeV2(params: {
  publicKey: string;
  ts: number;
  nonce: string;
  origin: string;
  ivB64u: string;
  ciphertextB64u: string;
}): unknown | null {
  try {
    const iv = Buffer.from(params.ivB64u, "base64url");
    const combined = Buffer.from(params.ciphertextB64u, "base64url");
    if (iv.length !== 12 || combined.length <= 16) return null;

    const authTag = combined.subarray(combined.length - 16);
    const ciphertext = combined.subarray(0, combined.length - 16);
    const key = Buffer.from(
      crypto.hkdfSync(
        "sha256",
        Buffer.from(params.publicKey, "utf8"),
        Buffer.from(`${params.ts}:${params.nonce}`, "utf8"),
        Buffer.from(`bloumeid-transport-v2:${params.origin}`, "utf8"),
        32
      )
    );

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(
      Buffer.from(`${params.publicKey}:${params.ts}:${params.nonce}:${params.origin}`, "utf8")
    );
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    return JSON.parse(plain) as unknown;
  } catch {
    return null;
  }
}

