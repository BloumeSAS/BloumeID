import crypto from "node:crypto";
import type { ApiKeyPrefix, SnowflakePrefix } from "@/types";

const BLOUME_EPOCH = 1735689600000n; // 2025-01-01T00:00:00.000Z

export class SnowflakeGenerator {
  private readonly workerId: bigint;
  private sequence = 0n;
  private lastTimestamp = -1n;

  constructor(workerId?: number) {
    const envWorker = Number(process.env.WORKER_ID ?? 1);
    const resolved = typeof workerId === "number" ? workerId : Number.isFinite(envWorker) ? envWorker : 1;
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

export function generateApiKey(prefix: ApiKeyPrefix): string {
  const token = crypto.randomBytes(24).toString("base64url");
  return `${prefix}_${token}`;
}

export function hashSecretKey(secretKey: string): string {
  return crypto.createHash("sha256").update(secretKey, "utf8").digest("hex");
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

