import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      index: true,
    },
    uploads: {
      type: Number,
      default: 0,
    },
    requests: {
      type: Number,
      default: 0,
    },
    storageUsed: {
      type: Number,
      default: 0,
    },
    bandwidthSaved: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

analyticsSchema.index({ date: 1 }, { unique: true });

export default mongoose.model('Analytics', analyticsSchema);
