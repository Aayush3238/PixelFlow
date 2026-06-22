import { S3Client } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

export const BUCKET_NAME = process.env.CLOUDFLARE_BUCKET_NAME;
export const PUBLIC_URL = process.env.CLOUDFLARE_PUBLIC_URL;

export default r2;
