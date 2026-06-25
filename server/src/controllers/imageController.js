import { v4 as uuidv4 } from 'uuid';
import Image from '../models/Image.js';
import { uploadToStorage, deleteMultipleFromStorage, getPublicUrl, listByPrefix } from '../services/storageService.js';
import { getOriginalMetadata, generateBlurPlaceholder, normalizeOriginalImage } from '../services/imageService.js';
import { recordUpload } from '../services/analyticsService.js';
import logger from '../utils/logger.js';
import dns from 'dns';

const MAX_DIMENSION = 10000;
const MAX_URL_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_BULK_DELETE = 50;
const FETCH_TIMEOUT_MS = 30000;
const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'tiff', 'gif']);

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeText = (value, fallback = '') =>
  String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

const isPrivateIP = (hostname) => {
  return new Promise((resolve) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) return resolve(true);
      for (const { address } of addresses) {
        if (
          address === '127.0.0.1' || address === '::1' ||
          address.startsWith('10.') ||
          address.startsWith('172.') ||
          address.startsWith('192.168.') ||
          address === '0.0.0.0' ||
          address.startsWith('169.254.') ||
          address === '::' || address.startsWith('fc') || address.startsWith('fd')
        ) {
          return resolve(true);
        }
      }
      resolve(false);
    });
  });
};

const normalizeTags = (tags) => {
  if (typeof tags === 'string') tags = tags.split(',');
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((tag) => safeText(tag).toLowerCase()).filter(Boolean))].slice(0, 20);
};

const parseExpiresAt = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const createImageFromBuffer = async (req, file, overrides = {}) => {
  const metadata = await getOriginalMetadata(file.buffer);
  if (!metadata.width || !metadata.height || !SUPPORTED_FORMATS.has(metadata.format)) {
    const error = new Error('Unsupported or invalid image file');
    error.statusCode = 400;
    throw error;
  }

  if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
    const error = new Error(`Image dimensions too large. Maximum is ${MAX_DIMENSION}x${MAX_DIMENSION}px.`);
    error.statusCode = 400;
    throw error;
  }

  const imageId = uuidv4();
  const originalName = safeText(overrides.originalName || file.originalname, `${imageId}.${metadata.format}`);
  const stripExif = overrides.stripExif !== false && overrides.stripExif !== 'false';
  const watermarkText = safeText(overrides.watermarkText);
  const normalizedBuffer = await normalizeOriginalImage(file.buffer, {
    format: metadata.format,
    stripExif,
    watermarkText,
  });
  const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
  const originalKey = `originals/${imageId}.${extension}`;

  await uploadToStorage(originalKey, normalizedBuffer, file.mimetype || `image/${metadata.format}`);
  const blurDataURL = await generateBlurPlaceholder(normalizedBuffer);

  const image = await Image.create({
    imageId,
    ownerId: req.user._id,
    originalKey,
    originalSize: normalizedBuffer.length,
    width: metadata.width,
    height: metadata.height,
    mimetype: file.mimetype || `image/${metadata.format}`,
    originalName,
    blurDataURL,
    tags: normalizeTags(overrides.tags),
    folder: safeText(overrides.folder),
    expiresAt: parseExpiresAt(overrides.expiresAt),
    stripExif,
    watermarkText,
  });

  await recordUpload(req.user._id, normalizedBuffer.length);
  logger.info('Image uploaded', { imageId, userId: req.user._id, size: normalizedBuffer.length });

  return {
    ...image.toObject(),
    url: getPublicUrl(originalKey),
  };
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const image = await createImageFromBuffer(req, req.file, req.body);
    res.status(201).json({
      image,
    });
  } catch (error) {
    logger.error('Upload failed', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const uploadBatch = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const uploaded = [];
    for (const file of req.files) {
      uploaded.push(await createImageFromBuffer(req, file, req.body));
    }

    res.status(201).json({ images: uploaded });
  } catch (error) {
    logger.error('Batch upload failed', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const uploadFromUrl = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'A valid image URL is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    if (await isPrivateIP(parsedUrl.hostname)) {
      return res.status(400).json({ error: 'URL must point to a public host' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url, {
        redirect: 'error',
        signal: controller.signal,
        headers: { 'User-Agent': 'PixelFlow/1.0' },
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return res.status(400).json({ error: 'Remote server timed out' });
      }
      return res.status(400).json({ error: 'Could not fetch image URL' });
    }
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(400).json({ error: 'Could not fetch image URL' });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'URL does not point to an image' });
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_URL_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Remote image is larger than 10MB' });
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_URL_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Remote image is larger than 10MB' });
    }

    const pathname = parsedUrl.pathname;
    const originalName = safeText(req.body.originalName || pathname.split('/').pop(), 'remote-image');
    const image = await createImageFromBuffer(
      req,
      {
        buffer: Buffer.from(arrayBuffer),
        originalname: originalName,
        mimetype: contentType.split(';')[0] || 'image/jpeg',
      },
      req.body
    );

    res.status(201).json({ image });
  } catch (error) {
    logger.error('URL upload failed', { error: error.message });
    res.status(error.statusCode || 500).json({ error: 'Upload failed' });
  }
};

export const getImage = async (req, res) => {
  try {
    const image = await Image.findOne({ imageId: req.params.imageId });
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({
      image: {
        ...image.toObject(),
        url: getPublicUrl(image.originalKey),
      },
    });
  } catch (error) {
    logger.error('Get image failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get image' });
  }
};

export const getUserImages = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 60);
    const skip = (page - 1) * limit;
    const filter = { ownerId: req.user._id };
    const { q, tag, folder } = req.query;

    if (q) {
      const safe = escapeRegex(safeText(q));
      filter.$or = [
        { originalName: { $regex: safe, $options: 'i' } },
        { tags: { $regex: safe.toLowerCase(), $options: 'i' } },
        { folder: { $regex: safe, $options: 'i' } },
      ];
    }
    if (tag) filter.tags = safeText(tag).toLowerCase();
    if (folder) filter.folder = safeText(folder);

    const images = await Image.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Image.countDocuments(filter);

    res.json({
      images: images.map((img) => ({
        ...img.toObject(),
        url: getPublicUrl(img.originalKey),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get user images failed', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch images' });
  }
};

export const searchImages = async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { ownerId: req.user._id };
    if (q) {
      filter.originalName = { $regex: escapeRegex(safeText(q)), $options: 'i' };
    }

    const images = await Image.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Image.countDocuments(filter);

    res.json({
      images: images.map((img) => ({
        ...img.toObject(),
        url: getPublicUrl(img.originalKey),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Search images failed', { error: error.message });
    res.status(500).json({ error: 'Failed to search images' });
  }
};

export const renameImage = async (req, res) => {
  try {
    const { originalName } = req.body;
    if (!originalName || !originalName.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const image = await Image.findOneAndUpdate(
      { imageId: req.params.imageId, ownerId: req.user._id },
      { originalName: safeText(originalName) },
      { new: true }
    );

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ image });
  } catch (error) {
    logger.error('Rename image failed', { error: error.message });
    res.status(500).json({ error: 'Failed to rename image' });
  }
};

export const updateImage = async (req, res) => {
  try {
    const updates = {};
    if (req.body.originalName !== undefined) updates.originalName = safeText(req.body.originalName);
    if (req.body.tags !== undefined) updates.tags = normalizeTags(req.body.tags);
    if (req.body.folder !== undefined) updates.folder = safeText(req.body.folder);
    if (req.body.expiresAt !== undefined) updates.expiresAt = parseExpiresAt(req.body.expiresAt);
    if (req.body.watermarkText !== undefined) updates.watermarkText = safeText(req.body.watermarkText);

    const image = await Image.findOneAndUpdate(
      { imageId: req.params.imageId, ownerId: req.user._id },
      updates,
      { new: true }
    );

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ image: { ...image.toObject(), url: getPublicUrl(image.originalKey) } });
  } catch (error) {
    logger.error('Update image failed', { error: error.message });
    res.status(500).json({ error: 'Failed to update image' });
  }
};

export const bulkDeleteImages = async (req, res) => {
  try {
    const { imageIds } = req.body;
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'imageIds array is required' });
    }
    if (imageIds.length > MAX_BULK_DELETE) {
      return res.status(400).json({ error: `Cannot delete more than ${MAX_BULK_DELETE} images at once` });
    }

    const images = await Image.find({
      imageId: { $in: imageIds },
      ownerId: req.user._id,
    });

    const keysToDelete = [];
    for (const img of images) {
      keysToDelete.push(img.originalKey);
      for (const format of img.formatsGenerated) {
        const prefix = `transformed/${format}`;
        const files = await listByPrefix(prefix);
        const matching = files
          .filter((f) => f.name.startsWith(img.imageId))
          .map((f) => `${prefix}/${f.name}`);
        keysToDelete.push(...matching);
      }
    }

    await deleteMultipleFromStorage(keysToDelete);
    await Image.deleteMany({ _id: { $in: images.map((i) => i._id) } });

    res.json({ deleted: images.length });
  } catch (error) {
    logger.error('Bulk delete failed', { error: error.message });
    res.status(500).json({ error: 'Failed to delete images' });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const image = await Image.findOne({
      imageId: req.params.imageId,
      ownerId: req.user._id,
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const keysToDelete = [image.originalKey];

    for (const format of image.formatsGenerated) {
      const prefix = `transformed/${format}`;
      const files = await listByPrefix(prefix);
      const matching = files
        .filter((f) => f.name.startsWith(image.imageId))
        .map((f) => `${prefix}/${f.name}`);
      keysToDelete.push(...matching);
    }

    await deleteMultipleFromStorage(keysToDelete);
    await Image.deleteOne({ _id: image._id });

    res.json({ message: 'Image deleted' });
  } catch (error) {
    logger.error('Delete image failed', { error: error.message });
    res.status(500).json({ error: 'Failed to delete image' });
  }
};
