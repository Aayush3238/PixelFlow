const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_BUCKET_NAME',
];

export default function validateEnv() {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this') {
    console.error('JWT_SECRET is still the default placeholder. Change it in server/.env');
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && (!process.env.CLIENT_URL || process.env.CLIENT_URL.includes('*'))) {
    console.error('CLIENT_URL must be set to explicit origin(s) in production');
    process.exit(1);
  }
}
