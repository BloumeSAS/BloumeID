import crypto from "node:crypto";
import Redis from "ioredis";

export interface VelocityCheckResult {
  visitorsPerIp10m: number;
  countriesPerVisitor1h: number;
  ipVelocityAnomaly: boolean;
  geoVelocityAnomaly: boolean;
}

class MemoryFallbackCache {
  private kv = new Map<string, { value: string; expiresAt: number }>();
  private sets = new Map<string, { members: Set<string>; expiresAt: number }>();
  private zsets = new Map<string, Array<{ score: number; member: string }>>();

  private now(): number {
    return Date.now();
  }

  public setNxEx(key: string, value: string, ttlSeconds: number): boolean {
    const now = this.now();
    if (this.kv.size > 10_000) {
      for (const [k, v] of this.kv) {
        if (v.expiresAt <= now) this.kv.delete(k);
      }
      if (this.kv.size > 10_000) {
        for (const k of this.kv.keys()) {
          this.kv.delete(k);
          if (this.kv.size <= 9_000) break;
        }
      }
    }
    const existing = this.kv.get(key);
    if (existing && existing.expiresAt > now) {
      return false;
    }
    this.kv.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  public slidingWindowCount(key: string, windowMs: number, maxLimit: number): {
    allowed: boolean;
    count: number;
  } {
    const now = this.now();
    const minScore = now - windowMs;
    if (this.zsets.size > 10_000) {
      for (const [k, arr] of this.zsets) {
        const active = arr.filter((item) => item.score > minScore);
        if (active.length === 0) this.zsets.delete(k);
        else this.zsets.set(k, active);
      }
      if (this.zsets.size > 10_000) this.zsets.clear();
    }
    const list = (this.zsets.get(key) ?? []).filter((item) => item.score > minScore);
    list.push({ score: now, member: `${now}-${crypto.randomUUID()}` });
    this.zsets.set(key, list);
    return {
      allowed: list.length <= maxLimit,
      count: list.length,
    };
  }

  public addSetMemberWithTtl(key: string, member: string, ttlSeconds: number): number {
    const now = this.now();
    if (this.sets.size > 10_000) {
      for (const [k, v] of this.sets) {
        if (v.expiresAt <= now) this.sets.delete(k);
      }
      if (this.sets.size > 10_000) this.sets.clear();
    }
    let entry = this.sets.get(key);
    if (!entry || entry.expiresAt <= now) {
      entry = { members: new Set<string>(), expiresAt: now + ttlSeconds * 1000 };
      this.sets.set(key, entry);
    }
    if (entry.members.size < 5_000) {
      entry.members.add(member);
    }
    return entry.members.size;
  }

  public clear(): void {
    this.kv.clear();
    this.sets.clear();
    this.zsets.clear();
  }
}

export const memoryCache = new MemoryFallbackCache();

let redisInstance: Redis | null = null;
let redisHealthy = false;

export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!redisInstance) {
    try {
      redisInstance = new Redis(url, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 1500,
        retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
      });
      redisInstance.on("ready", () => {
        redisHealthy = true;
      });
      redisInstance.on("error", () => {
        redisHealthy = false;
      });
      redisInstance.on("close", () => {
        redisHealthy = false;
      });
      redisInstance.on("end", () => {
        redisHealthy = false;
      });
      // Initiate non-blocking background handshake so `redisHealthy` becomes true in production
      void redisInstance.connect().catch(() => {
        redisHealthy = false;
      });
    } catch {
      redisInstance = null;
      redisHealthy = false;
    }
  }
  return redisInstance;
}

/**
 * Sliding window rate limiter backed by Redis ZSET (or in-memory fallback).
 */
export async function checkSlidingWindowRateLimit(params: {
  key: string;
  windowSeconds: number;
  maxRequests: number;
}): Promise<{ allowed: boolean; currentCount: number; remaining: number }> {
  const windowMs = params.windowSeconds * 1000;
  const client = getRedisClient();

  if (client && redisHealthy) {
    try {
      const now = Date.now();
      const minScore = now - windowMs;
      const redisKey = `bloumeid:rl:${params.key}`;
      const multi = client.multi();
      multi.zremrangebyscore(redisKey, 0, minScore);
      multi.zadd(redisKey, now, `${now}-${crypto.randomUUID()}`);
      multi.zcard(redisKey);
      multi.expire(redisKey, params.windowSeconds + 5);
      const res = await multi.exec();
      const cardTuple = res?.[2];
      if (!res || !cardTuple || cardTuple[0] || typeof cardTuple[1] !== "number") {
        throw new Error("Redis rate-limit exec failure");
      }
      const count = cardTuple[1];
      return {
        allowed: count <= params.maxRequests,
        currentCount: count,
        remaining: Math.max(0, params.maxRequests - count),
      };
    } catch {
      // Fallback to memory cache
    }
  }

  const mem = memoryCache.slidingWindowCount(params.key, windowMs, params.maxRequests);
  return {
    allowed: mem.allowed,
    currentCount: mem.count,
    remaining: Math.max(0, params.maxRequests - mem.count),
  };
}

/**
 * Consumes a single-use anti-replay nonce with configurable TTL (default 600s, 120s for v2 encrypted envelopes).
 * Returns true if the nonce is fresh; false if it was already seen.
 */
export async function consumeAntiReplayNonce(
  sitePublicId: string,
  nonce: string,
  ttlSeconds = 600
): Promise<boolean> {
  const key = `bloumeid:nonce:${sitePublicId}:${nonce}`;
  const client = getRedisClient();

  if (client && redisHealthy) {
    try {
      const res = await client.set(key, "1", "EX", ttlSeconds, "NX");
      return res === "OK";
    } catch {
      // Fallback to memory cache
    }
  }

  return memoryCache.setNxEx(key, "1", ttlSeconds);
}

/**
 * Tracks velocity anomalies in Redis:
 * - >5 distinct visitorIds per IP address within 10 minutes
 * - >5 distinct countries per visitorId within 1 hour
 */
export async function recordAndCheckVelocity(params: {
  ipAddress: string;
  visitorPublicId: string;
  country: string | null;
}): Promise<VelocityCheckResult> {
  const ipKey = `bloumeid:vel:ip:${params.ipAddress}`;
  const geoKey = `bloumeid:vel:geo:${params.visitorPublicId}`;
  const client = getRedisClient();

  let visitorsPerIp10m = 1;
  let countriesPerVisitor1h = params.country ? 1 : 0;

  if (client && redisHealthy) {
    try {
      const pipeline = client.pipeline();
      pipeline.sadd(ipKey, params.visitorPublicId);
      pipeline.expire(ipKey, 600);
      pipeline.scard(ipKey);

      if (params.country) {
        pipeline.sadd(geoKey, params.country);
        pipeline.expire(geoKey, 3600);
        pipeline.scard(geoKey);
      }

      const results = await pipeline.exec();
      const ipTuple = results?.[2];
      if (!results || !ipTuple || ipTuple[0] || typeof ipTuple[1] !== "number") {
        throw new Error("Redis velocity exec failure");
      }
      visitorsPerIp10m = ipTuple[1];
      if (params.country) {
        const geoTuple = results[5];
        if (!geoTuple || geoTuple[0] || typeof geoTuple[1] !== "number") {
          throw new Error("Redis geo velocity exec failure");
        }
        countriesPerVisitor1h = geoTuple[1];
      }
      return {
        visitorsPerIp10m,
        countriesPerVisitor1h,
        ipVelocityAnomaly: visitorsPerIp10m > 5,
        geoVelocityAnomaly: countriesPerVisitor1h > 5,
      };
    } catch {
      // Fallback to memory cache
    }
  }

  visitorsPerIp10m = memoryCache.addSetMemberWithTtl(ipKey, params.visitorPublicId, 600);
  if (params.country) {
    countriesPerVisitor1h = memoryCache.addSetMemberWithTtl(geoKey, params.country, 3600);
  }

  return {
    visitorsPerIp10m,
    countriesPerVisitor1h,
    ipVelocityAnomaly: visitorsPerIp10m > 5,
    geoVelocityAnomaly: countriesPerVisitor1h > 5,
  };
}

