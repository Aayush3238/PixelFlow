import { getImageFromCacheOrTransform, detectFormat } from '../services/imageService.js';
import { getFromStorage } from '../services/storageService.js';
import Image from '../models/Image.js';
import Analytics from '../models/Analytics.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

const WIDTH_PRESETS = [300, 600, 1200];
const DEFAULT_QUALITY = { avif: 65, webp: 75, jpeg: 80 };
const SAVE_DATA_QUALITY = { avif: 45, webp: 55, jpeg: 60 };

const snapToPreset = (requested, original) => {
  if (original <= 300) return null;
  let closest = WIDTH_PRESETS[0];
  for (const preset of WIDTH_PRESETS) {
    if (Math.abs(requested - preset) < Math.abs(requested - closest)) {
      closest = preset;
    }
  }
  if (closest >= original) return null;
  return closest;
};

export const deliverImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const requestedWidth = req.query.w ? parseInt(req.query.w) : null;
    const forcedFormat = req.query.format;
    const download = req.query.download === 'true';
    const format = forcedFormat && ['avif', 'webp', 'jpeg'].includes(forcedFormat)
      ? forcedFormat
      : detectFormat(req.headers.accept);

    const saveData = req.headers['save-data'] === 'on';
    const requestedQuality = req.query.q ? parseInt(req.query.q) : null;
    const quality = requestedQuality
      ? Math.min(100, Math.max(1, requestedQuality))
      : saveData
        ? SAVE_DATA_QUALITY[format]
        : DEFAULT_QUALITY[format];

    if (requestedWidth && (requestedWidth < 10 || requestedWidth > 4000)) {
      return res.status(400).json({ error: 'Width must be between 10 and 4000' });
    }

    const image = await Image.findOne({ imageId });
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    if (image.expiresAt && image.expiresAt <= new Date()) {
      return res.status(410).json({ error: 'Image has expired' });
    }

    const setCommonHeaders = (buffer, mimetype) => {
      res.set('Content-Type', mimetype);
      res.set('Cache-Control', 'public, max-age=31536000');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      const etag = `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;
      res.set('ETag', etag);
      if (download) {
        const ext = mimetype.split('/')[1] || 'bin';
        res.set('Content-Disposition', `attachment; filename="${imageId}.${ext}"`);
      }
      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return true;
      }
      return false;
    };

    if (!requestedWidth) {
      const blob = await getFromStorage(image.originalKey);
      const buffer = Buffer.from(await blob.arrayBuffer());

      await Image.findOneAndUpdate({ imageId }, { $inc: { requests: 1 } });

      const today = new Date().toISOString().split('T')[0];
      await Analytics.findOneAndUpdate(
        { date: today, ownerId: image.ownerId },
        { $inc: { requests: 1 } },
        { upsert: true }
      );

      if (setCommonHeaders(buffer, image.mimetype)) return;
      return res.send(buffer);
    }

    const width = snapToPreset(requestedWidth, image.width);
    if (!width) {
      const blob = await getFromStorage(image.originalKey);
      const buffer = Buffer.from(await blob.arrayBuffer());

      await Image.findOneAndUpdate({ imageId }, { $inc: { requests: 1 } });

      const today = new Date().toISOString().split('T')[0];
      await Analytics.findOneAndUpdate(
        { date: today, ownerId: image.ownerId },
        { $inc: { requests: 1 } },
        { upsert: true }
      );

      if (setCommonHeaders(buffer, image.mimetype)) return;
      return res.send(buffer);
    }

    const result = await getImageFromCacheOrTransform(imageId, width, format, quality);
    if (!result) {
      return res.status(404).json({ error: 'Image processing failed' });
    }

    res.set('Content-Type', result.contentType);
    res.set('Vary', 'Accept, Save-Data');
    res.set('Cache-Control', result.fromCache
      ? 'public, max-age=31536000'
      : 'public, max-age=86400'
    );
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('X-Cache', result.fromCache ? 'HIT' : 'MISS');
    const etag = `"${crypto.createHash('md5').update(result.buffer).digest('hex')}"`;
    res.set('ETag', etag);
    if (download) {
      const ext = result.contentType.split('/')[1] || 'bin';
      res.set('Content-Disposition', `attachment; filename="${imageId}.${ext}"`);
    }
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    res.send(result.buffer);
  } catch (error) {
    logger.error('Delivery error', { error: error.message });
    res.status(500).json({ error: 'Image delivery failed' });
  }
};

export const getImageMeta = async (req, res) => {
  try {
    const { imageId } = req.params;
    const image = await Image.findOne({ imageId }).select('imageId width height originalName originalSize mimetype blurDataURL');
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const availableWidths = WIDTH_PRESETS.filter((w) => w < image.width);

    res.json({
      imageId: image.imageId,
      width: image.width,
      height: image.height,
      originalName: image.originalName,
      originalSize: image.originalSize,
      mimetype: image.mimetype,
      blurDataURL: image.blurDataURL,
      srcset: availableWidths.map((w) => ({
        width: w,
        url: `/i/${imageId}?w=${w}`,
      })),
      formats: ['avif', 'webp', 'jpeg'],
    });
  } catch (error) {
    logger.error('Meta error', { error: error.message });
    res.status(500).json({ error: 'Failed to get image metadata' });
  }
};
