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
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    folder: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    stripExif: {
      type: Boolean,
      default: true,
    },
    watermarkText: {
      type: String,
      default: '',
      trim: true,
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
    blurDataURL: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

imageSchema.index({ ownerId: 1, createdAt: -1 });
imageSchema.index({ ownerId: 1, originalName: 'text', tags: 'text', folder: 'text' });

export default mongoose.model('Image', imageSchema);
