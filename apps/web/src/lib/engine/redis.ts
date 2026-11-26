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
    const existing = this.kv.get(key);
    if (existing && existing.expiresAt > this.now()) {
      return false;
    }
    this.kv.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 });
    return true;
  }

  public slidingWindowCount(key: string, windowMs: number, maxLimit: number): {
    allowed: boolean;
    count: number;
  } {
    const now = this.now();
    const minScore = now - windowMs;
    const list = (this.zsets.get(key) ?? []).filter((item) => item.score > minScore);
    list.push({ score: now, member: `${now}-${Math.random()}` });
    this.zsets.set(key, list);
    return {
      allowed: list.length <= maxLimit,
      count: list.length,
    };
  }

  public addSetMemberWithTtl(key: string, member: string, ttlSeconds: number): number {
    const now = this.now();
    let entry = this.sets.get(key);
    if (!entry || entry.expiresAt <= now) {
      entry = { members: new Set<string>(), expiresAt: now + ttlSeconds * 1000 };
      this.sets.set(key, entry);
    }
    entry.members.add(member);
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
      multi.zadd(redisKey, now, `${now}-${Math.random()}`);
      multi.zcard(redisKey);
      multi.expire(redisKey, params.windowSeconds + 5);
      const res = await multi.exec();
      const count = Number(res?.[2]?.[1] ?? 1);
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
 * Consumes a single-use anti-replay nonce with a 10-minute TTL.
 * Returns true if the nonce is fresh; false if it was already seen.
 */
export async function consumeAntiReplayNonce(sitePublicId: string, nonce: string): Promise<boolean> {
  const ttlSeconds = 600;
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
      await client.sadd(ipKey, params.visitorPublicId);
      await client.expire(ipKey, 600);
      visitorsPerIp10m = await client.scard(ipKey);

      if (params.country) {
        await client.sadd(geoKey, params.country);
        await client.expire(geoKey, 3600);
        countriesPerVisitor1h = await client.scard(geoKey);
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

