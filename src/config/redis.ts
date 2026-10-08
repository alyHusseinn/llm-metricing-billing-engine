// src/config/redis.ts
import { Redis } from 'ioredis';
import { env } from '../utils/env';

export const redisConnection = new Redis({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
