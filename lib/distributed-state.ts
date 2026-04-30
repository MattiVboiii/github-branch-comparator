import { Redis } from "@upstash/redis";

type MemoryRecord = {
  value: unknown;
  expiresAt: number | null;
};

const memoryStore = new Map<string, MemoryRecord>();

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const hasKvConfig = Boolean(redisUrl) && Boolean(redisToken);

const redisNamespace =
  process.env.REDIS_KEY_PREFIX?.trim() || "github-branch-comparator";

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: redisUrl!,
      token: redisToken!,
    });
  }
  return _redis;
}

const SECOND = 1000;

function nowMs() {
  return Date.now();
}

function buildStorageKey(key: string) {
  return `${redisNamespace}:${key}`;
}

function getFromMemory<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;

  if (entry.expiresAt !== null && entry.expiresAt <= nowMs()) {
    memoryStore.delete(key);
    return null;
  }

  return entry.value as T;
}

function setToMemory(key: string, value: unknown, ttlMs?: number) {
  const expiresAt = typeof ttlMs === "number" ? nowMs() + ttlMs : null;
  memoryStore.set(key, { value, expiresAt });
}

function deleteFromMemory(key: string) {
  memoryStore.delete(key);
}

async function getValue<T>(key: string): Promise<T | null> {
  const storageKey = buildStorageKey(key);

  if (!hasKvConfig) {
    return getFromMemory<T>(storageKey);
  }

  try {
    const value = await getRedis().get<T>(storageKey);
    return value ?? null;
  } catch {
    return getFromMemory<T>(storageKey);
  }
}

async function setValue(
  key: string,
  value: unknown,
  ttlMs?: number,
): Promise<void> {
  const storageKey = buildStorageKey(key);

  if (!hasKvConfig) {
    setToMemory(storageKey, value, ttlMs);
    return;
  }

  try {
    if (typeof ttlMs === "number") {
      await getRedis().set(storageKey, value, {
        ex: Math.max(1, Math.ceil(ttlMs / SECOND)),
      });
    } else {
      await getRedis().set(storageKey, value);
    }
  } catch {
    setToMemory(storageKey, value, ttlMs);
  }
}

export type DistributedRateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

export async function consumeDistributedRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<DistributedRateLimitResult> {
  const bucket = Math.floor(nowMs() / windowMs);
  const rateLimitKey = buildStorageKey(`rl:${key}:${bucket}`);

  if (!hasKvConfig) {
    const existing =
      getFromMemory<{ count: number; expiresAt: number }>(rateLimitKey) ?? null;
    const nextCount = (existing?.count ?? 0) + 1;

    setToMemory(
      rateLimitKey,
      {
        count: nextCount,
        expiresAt: nowMs() + windowMs,
      },
      windowMs,
    );

    const remaining = Math.max(0, maxRequests - nextCount);
    const retryAfterSeconds = Math.max(1, Math.ceil(windowMs / SECOND));

    return {
      limited: nextCount > maxRequests,
      retryAfterSeconds,
      remaining,
    };
  }

  try {
    const redis = getRedis();
    const count = await redis.incr(rateLimitKey);
    if (count === 1) {
      await redis.expire(
        rateLimitKey,
        Math.max(1, Math.ceil(windowMs / SECOND)),
      );
    }

    const ttlSeconds = await redis.ttl(rateLimitKey);
    const retryAfterSeconds = ttlSeconds > 0 ? ttlSeconds : 1;

    return {
      limited: count > maxRequests,
      retryAfterSeconds,
      remaining: Math.max(0, maxRequests - count),
    };
  } catch {
    const fallback =
      getFromMemory<{ count: number; expiresAt: number }>(rateLimitKey) ?? null;
    const nextCount = (fallback?.count ?? 0) + 1;
    setToMemory(
      rateLimitKey,
      {
        count: nextCount,
        expiresAt: nowMs() + windowMs,
      },
      windowMs,
    );

    return {
      limited: nextCount > maxRequests,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / SECOND)),
      remaining: Math.max(0, maxRequests - nextCount),
    };
  }
}

export async function getDistributedValue<T>(key: string): Promise<T | null> {
  return getValue<T>(key);
}

export async function setDistributedValue(
  key: string,
  value: unknown,
  ttlMs?: number,
): Promise<void> {
  await setValue(key, value, ttlMs);
}

export async function tryAcquireDistributedLock(
  key: string,
  owner: string,
  ttlMs: number,
): Promise<boolean> {
  const storageKey = buildStorageKey(key);

  if (!hasKvConfig) {
    const current = getFromMemory<string>(storageKey);
    if (current) return false;
    setToMemory(storageKey, owner, ttlMs);
    return true;
  }

  try {
    const acquired = await getRedis().set(storageKey, owner, {
      nx: true,
      ex: Math.max(1, Math.ceil(ttlMs / SECOND)),
    });

    return acquired === "OK";
  } catch {
    const current = getFromMemory<string>(storageKey);
    if (current) return false;
    setToMemory(storageKey, owner, ttlMs);
    return true;
  }
}

export async function releaseDistributedLock(
  key: string,
  owner: string,
): Promise<void> {
  const storageKey = buildStorageKey(key);

  if (!hasKvConfig) {
    const current = getFromMemory<string>(storageKey);
    if (current === owner) {
      deleteFromMemory(storageKey);
    }
    return;
  }

  try {
    const redis = getRedis();
    const current = await redis.get<string>(storageKey);
    if (current === owner) {
      await redis.del(storageKey);
    }
  } catch {
    const current = getFromMemory<string>(storageKey);
    if (current === owner) {
      deleteFromMemory(storageKey);
    }
  }
}
