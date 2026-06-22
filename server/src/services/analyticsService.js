import Image from '../models/Image.js';
import Analytics from '../models/Analytics.js';

export const getDashboardStats = async (userId) => {
  const images = await Image.find({ ownerId: userId });

  const totalImages = images.length;
  const totalRequests = images.reduce((sum, img) => sum + img.requests, 0);
  const storageUsed = images.reduce((sum, img) => sum + img.originalSize, 0);
  const bandwidthSaved = images.reduce((sum, img) => sum + img.bandwidthSaved, 0);

  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last30Days.push(date.toISOString().split('T')[0]);
  }

  const dailyStats = await Analytics.find({
    date: { $in: last30Days },
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
    totalImages,
    totalRequests,
    storageUsed,
    bandwidthSaved,
    chartData,
  };
};

export const recordUpload = async (userId, fileSize) => {
  const today = new Date().toISOString().split('T')[0];
  await Analytics.findOneAndUpdate(
    { date: today },
    {
      $inc: {
        uploads: 1,
        storageUsed: fileSize,
      },
    },
    { upsert: true }
  );
};
