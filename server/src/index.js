import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import redis from './config/redis.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import analyticsRoutes from './routes/analytics.js';
import deliveryRoutes from './routes/delivery.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/dashboard', analyticsRoutes);
app.use('/i', deliveryRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    await redis.ping();

    app.listen(PORT, () => {
      console.log(`PixelFlow server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
