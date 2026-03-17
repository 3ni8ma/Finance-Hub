import Redis from 'ioredis'
import logger from '../utils/logger'

let redisClient: Redis | null = null

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    })
    redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`))
    redisClient.on('connect', () => logger.info('Redis connected'))
  }
  return redisClient
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await getRedis().get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // fail silently
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis().del(key)
  } catch {
    // fail silently
  }
}
