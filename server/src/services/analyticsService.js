import Image from '../models/Image.js';
import Analytics from '../models/Analytics.js';

export const getDashboardStats = async (userId) => {
  const [imageStats] = await Image.aggregate([
    { $match: { ownerId: userId } },
    {
      $group: {
        _id: null,
        totalImages: { $sum: 1 },
        totalRequests: { $sum: '$requests' },
        storageUsed: { $sum: '$originalSize' },
        bandwidthSaved: { $sum: '$bandwidthSaved' },
      },
    },
  ]);

  const totals = imageStats || {
    totalImages: 0,
    totalRequests: 0,
    storageUsed: 0,
    bandwidthSaved: 0,
  };

  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last30Days.push(date.toISOString().split('T')[0]);
  }

  const dailyStats = await Analytics.find({
    date: { $in: last30Days },
    ownerId: userId,
  }).sort({ date: 1 });

  const dailyMap = {};
  dailyStats.forEach((stat) => {
    dailyMap[stat.date] = stat;
  });

  const chartData = last30Days.map((date) => ({
    date,
    requests: dailyMap[date]?.requests || 0,
    bandwidthSaved: dailyMap[date]?.bandwidthSaved || 0,
    uploads: dailyMap[date]?.uploads || 0,
  }));

  return {
    totalImages: totals.totalImages,
    totalRequests: totals.totalRequests,
    storageUsed: totals.storageUsed,
    bandwidthSaved: totals.bandwidthSaved,
    chartData,
  };
};

export const recordUpload = async (userId, fileSize) => {
  const today = new Date().toISOString().split('T')[0];
  await Analytics.findOneAndUpdate(
    { date: today, ownerId: userId },
    {
      $inc: {
        uploads: 1,
        storageUsed: fileSize,
      },
    },
    { upsert: true }
  );
};
