import { getDashboardStats } from '../services/analyticsService.js';

export const getDashboard = async (req, res) => {
  try {
    const stats = await getDashboardStats(req.user._id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
