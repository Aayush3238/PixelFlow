import redis from '../config/redis.js';
import logger from '../utils/logger.js';

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_ANONYMOUS = 30;
const MAX_REQUESTS_AUTHENTICATED = 120;

export const rateLimiter = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const userId = req.user?._id?.toString();
  const key = userId ? `ratelimit:user:${userId}` : `ratelimit:ip:${ip}`;
  const maxRequests = userId ? MAX_REQUESTS_AUTHENTICATED : MAX_REQUESTS_ANONYMOUS;
  const now = Date.now();

  try {
    const windowStart = now - WINDOW_MS;
    await redis.zremrangebyscore(key, 0, windowStart);
    await redis.zadd(key, { score: now, member: `${now}` });
    await redis.pexpire(key, WINDOW_MS);

    const count = await redis.zcard(key);
    if (count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests, try again later' });
    }

    next();
  } catch (error) {
    logger.error('Rate limiter error, rejecting request', { error: error.message });
    res.status(503).json({ error: 'Service temporarily unavailable' });
  }
};
