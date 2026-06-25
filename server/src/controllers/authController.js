import User from '../models/User.js';
import Image from '../models/Image.js';
import Analytics from '../models/Analytics.js';
import ApiKey, { createApiKeyValue, hashApiKey } from '../models/ApiKey.js';
import jwt from 'jsonwebtoken';
import { generateRefreshToken, generateToken } from '../middleware/auth.js';
import { validationResult } from 'express-validator';
import { deleteMultipleFromStorage, listByPrefix } from '../services/storageService.js';
import logger from '../utils/logger.js';

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({ email, password, name });
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({ token, refreshToken, user });
  } catch (error) {
    logger.error('Registration failed', { error: error.message });
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    res.json({ token, refreshToken, user });
  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      token: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id),
      user,
    });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const createApiKey = async (req, res) => {
  try {
    const name = (req.body.name || 'Default key').trim().slice(0, 80);
    const key = createApiKeyValue();
    const apiKey = await ApiKey.create({
      ownerId: req.user._id,
      name,
      keyHash: hashApiKey(key),
      prefix: key.slice(0, 10),
    });

    res.status(201).json({
      key,
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        lastUsedAt: apiKey.lastUsedAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    logger.error('Create API key failed', { error: error.message });
    res.status(500).json({ error: 'Failed to create API key' });
  }
};

export const listApiKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .select('name prefix lastUsedAt createdAt');
    res.json({ keys });
  } catch (error) {
    logger.error('List API keys failed', { error: error.message });
    res.status(500).json({ error: 'Failed to list API keys' });
  }
};

export const deleteApiKey = async (req, res) => {
  try {
    await ApiKey.deleteOne({ _id: req.params.keyId, ownerId: req.user._id });
    res.json({ message: 'API key deleted' });
  } catch (error) {
    logger.error('Delete API key failed', { error: error.message });
    res.status(500).json({ error: 'Failed to delete API key' });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const images = await Image.find({ ownerId: userId });
    for (const img of images) {
      const keysToDelete = [img.originalKey];
      for (const format of img.formatsGenerated) {
        const prefix = `transformed/${format}`;
        const files = await listByPrefix(prefix);
        const matching = files
          .filter((f) => f.name.startsWith(img.imageId))
          .map((f) => `${prefix}/${f.name}`);
        keysToDelete.push(...matching);
      }
      try { await deleteMultipleFromStorage(keysToDelete); } catch {}
    }

    await Image.deleteMany({ ownerId: userId });
    await Analytics.deleteMany({ ownerId: userId });
    await ApiKey.deleteMany({ ownerId: userId });
    await User.deleteOne({ _id: userId });

    res.json({ message: 'Account deleted' });
  } catch (error) {
    logger.error('Delete account failed', { error: error.message });
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
