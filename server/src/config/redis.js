import { Redis } from '@upstash/redis';
import logger from '../utils/logger.js';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

redis.ping().then(() => {
  logger.info('Redis connected');
}).catch((err) => {
  logger.error('Redis connection error', { error: err.message });
});

export default redis;
