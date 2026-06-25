import crypto from 'crypto';
import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prefix: {
      type: String,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const hashApiKey = (key) => crypto.createHash('sha256').update(key).digest('hex');
export const createApiKeyValue = () => `pf_${crypto.randomBytes(32).toString('hex')}`;

export default mongoose.model('ApiKey', apiKeySchema);
