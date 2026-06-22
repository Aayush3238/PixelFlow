import sharp from 'sharp';
import { getFromR2, uploadToR2, getTransformedKey } from './r2Service.js';
import redis from '../config/redis.js';
import Image from '../models/Image.js';
import Analytics from '../models/Analytics.js';

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

const FORMAT_MAP = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
};

const WIDTH_PRESETS = {
  '300': 300,
  '600': 600,
  '1200': 1200,
};

export const getImageFromCacheOrTransform = async (imageId, width, format) => {
  const cacheKey = `img:${imageId}:${width}:${format}`;

  const cached = await redis.getBuffer(cacheKey);
  if (cached) {
    return { buffer: cached, fromCache: true, contentType: FORMAT_MAP[format] };
  }

  const image = await Image.findOne({ imageId });
  if (!image) return null;

  const transformedKey = getTransformedKey(imageId, width, format);
  const { Body } = await getFromR2(image.originalKey);
  const originalBuffer = Buffer.from(await Body.transformToByteArray());

  let pipeline = sharp(originalBuffer).resize({ width, withoutEnlargement: true });

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

  await uploadToR2(transformedKey, transformedBuffer, FORMAT_MAP[format]);

  await redis.setex(cacheKey, CACHE_TTL, transformedBuffer);

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
      { date: today },
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
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
  };
};
