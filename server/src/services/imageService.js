import sharp from 'sharp';
import { getFromStorage, uploadToStorage, getTransformedKey } from './storageService.js';
import redis from '../config/redis.js';
import Image from '../models/Image.js';
import Analytics from '../models/Analytics.js';

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

const FORMAT_MAP = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
};

export const getImageFromCacheOrTransform = async (imageId, width, format) => {
  const cacheKey = `img:${imageId}:${width}:${format}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const buffer = Buffer.from(cached, 'base64');
      return { buffer, fromCache: true, contentType: FORMAT_MAP[format] };
    }
  } catch {}

  const image = await Image.findOne({ imageId });
  if (!image) return null;

  const transformedKey = getTransformedKey(imageId, width, format);
  const blob = await getFromStorage(image.originalKey);
  const originalBuffer = Buffer.from(await blob.arrayBuffer());

  let pipeline = sharp(originalBuffer, { sequentialRead: true, limitInputPixels: 10000 * 10000 })
    .resize({ width, withoutEnlargement: true })
    .rotate()
    .withMetadata({ exif: false });

  switch (format) {
    case 'avif':
      pipeline = pipeline.avif({ quality: 65, effort: 4 });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: 75 });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: 80, progressive: true });
      break;
  }

  const transformedBuffer = await pipeline.toBuffer();

  await uploadToStorage(transformedKey, transformedBuffer, FORMAT_MAP[format]);

  try {
    await redis.set(cacheKey, transformedBuffer.toString('base64'), { ex: CACHE_TTL });
  } catch {}

  if (!image.formatsGenerated.includes(format)) {
    await Image.findOneAndUpdate(
      { imageId },
      { $addToSet: { formatsGenerated: format } }
    );
  }

  await Image.findOneAndUpdate({ imageId }, { $inc: { requests: 1 } });

  const bandwidthSaved = image.originalSize - transformedBuffer.length;
  if (bandwidthSaved > 0) {
    await Image.findOneAndUpdate(
      { imageId },
      { $inc: { bandwidthSaved } }
    );

    const today = new Date().toISOString().split('T')[0];
    await Analytics.findOneAndUpdate(
      { date: today, ownerId: image.ownerId },
      {
        $inc: {
          requests: 1,
          bandwidthSaved,
        },
      },
      { upsert: true }
    );
  }

  return { buffer: transformedBuffer, fromCache: false, contentType: FORMAT_MAP[format] };
};

export const detectFormat = (acceptHeader) => {
  if (acceptHeader && acceptHeader.includes('image/avif')) return 'avif';
  if (acceptHeader && acceptHeader.includes('image/webp')) return 'webp';
  return 'jpeg';
};

export const getOriginalMetadata = async (buffer) => {
  const metadata = await sharp(buffer, { sequentialRead: true, limitInputPixels: 10000 * 10000 }).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  };
};

export const generateBlurPlaceholder = async (buffer) => {
  try {
    const blurred = await sharp(buffer, { sequentialRead: true, limitInputPixels: 10000 * 10000 })
      .resize({ width: 20, withoutEnlargement: true })
      .blur(10)
      .jpeg({ quality: 20 })
      .toBuffer();
    return `data:image/jpeg;base64,${blurred.toString('base64')}`;
  } catch {
    return null;
  }
};

export const normalizeOriginalImage = async (buffer, { format, stripExif = true, watermarkText = '' } = {}) => {
  let pipeline = sharp(buffer, { sequentialRead: true, limitInputPixels: 10000 * 10000 }).rotate();

  if (watermarkText) {
    const safeWatermark = watermarkText.replace(/[<>&"'`\\]/g, '').slice(0, 100);
    pipeline = pipeline.composite([
      {
        input: Buffer.from(`
          <svg width="800" height="120">
            <rect width="800" height="120" fill="rgba(0,0,0,0.35)"/>
            <text x="28" y="74" font-family="Arial" font-size="42" fill="white">${safeWatermark}</text>
          </svg>
        `),
        gravity: 'southeast',
      },
    ]);
  }

  if (!stripExif) {
    pipeline = pipeline.withMetadata();
  }

  switch (format) {
    case 'jpeg':
      return pipeline.jpeg({ quality: 92, progressive: true }).toBuffer();
    case 'png':
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
    case 'webp':
      return pipeline.webp({ quality: 90 }).toBuffer();
    case 'avif':
      return pipeline.avif({ quality: 85, effort: 4 }).toBuffer();
    default:
      return pipeline.toBuffer();
  }
};
