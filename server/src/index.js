import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import redis from './config/redis.js';
import { configurePassport } from './config/passport.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import analyticsRoutes from './routes/analytics.js';
import deliveryRoutes from './routes/delivery.js';
import validateEnv from './utils/validateEnv.js';
import logger from './utils/logger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import mongoose from 'mongoose';

validateEnv();
configurePassport();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(passport.initialize());

app.use('/api/auth', rateLimiter, authRoutes);
app.use('/api/images', rateLimiter, imageRoutes);
app.use('/api/dashboard', rateLimiter, analyticsRoutes);
app.use('/i', deliveryRoutes);

app.get('/health', async (req, res) => {
  try {
    const redisStatus = await redis.ping();
    const dbReady = mongoose.connection.readyState === 1;

    if (redisStatus !== 'PONG' || !dbReady) {
      return res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        redis: redisStatus === 'PONG' ? 'connected' : 'disconnected',
        database: dbReady ? 'connected' : 'disconnected',
      });
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      redis: 'connected',
      database: 'connected',
    });
  } catch {
    res.status(503).json({ status: 'error', redis: 'disconnected', database: 'unknown' });
  }
});

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/i')) {
    return next();
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use(errorHandler);

let server;

const start = async () => {
  server = app.listen(PORT, () => {
    logger.info(`PixelFlow server running on port ${PORT}`);
  });

  try {
    await connectDB();
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
  }

  try {
    await redis.ping();
    logger.info('Redis connected');
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message });
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`);
  if (server) await new Promise((resolve) => server.close(resolve));
  logger.info('HTTP server closed');
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch {}
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
