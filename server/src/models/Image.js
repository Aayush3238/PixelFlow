import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    imageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalKey: {
      type: String,
      required: true,
    },
    originalSize: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    formatsGenerated: {
      type: [String],
      default: [],
    },
    requests: {
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

imageSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.model('Image', imageSchema);
