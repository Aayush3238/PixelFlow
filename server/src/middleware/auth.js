import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiKey, { hashApiKey } from '../models/ApiKey.js';

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (apiKey) {
      const keyRecord = await ApiKey.findOneAndUpdate(
        { keyHash: hashApiKey(apiKey) },
        { lastUsedAt: new Date() },
        { new: true }
      );

      if (!keyRecord) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const user = await User.findById(keyRecord.ownerId).select('-password');
      if (!user) {
        return res.status(401).json({ error: 'API key owner not found' });
      }

      req.user = user;
      req.apiKey = keyRecord;
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'Not authorized, user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, token invalid' });
  }
};

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '90d' });
};
