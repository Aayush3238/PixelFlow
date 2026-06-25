import { getDashboardStats } from '../services/analyticsService.js';
import logger from '../utils/logger.js';

export const getDashboard = async (req, res) => {
  try {
    const stats = await getDashboardStats(req.user._id);
    res.json(stats);
  } catch (error) {
    logger.error('Dashboard stats failed', { error: error.message });
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};
