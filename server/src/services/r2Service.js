import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import r2, { BUCKET_NAME, PUBLIC_URL } from '../config/r2.js';

export const uploadToR2 = async (key, body, contentType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2.send(command);
  return key;
};

export const getFromR2 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return r2.send(command);
};

export const existsInR2 = async (key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await r2.send(command);
    return true;
  } catch {
    return false;
  }
};

export const getPublicUrl = (key) => {
  return `${PUBLIC_URL}/${key}`;
};

export const deleteFromR2 = async (key) => {
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await r2.send(command);
};

export const getTransformedKey = (imageId, width, format) => {
  return `transformed/${format}/${imageId}_${width}.${format}`;
};

export const getOriginalKey = (imageId, originalName) => {
  const ext = originalName.split('.').pop();
  return `originals/${imageId}.${ext}`;
};
