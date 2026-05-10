import { registerAs } from '@nestjs/config';

/**
 * WHY R2 over S3: Same S3-compatible API, zero egress fees, cheaper storage.
 * WHY @aws-sdk/client-s3: Works with any S3-compatible endpoint — swap region
 * and endpoint to move to S3, MinIO, or any other provider without changing
 * application code.
 */
export default registerAs('storage', () => ({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucket: process.env.R2_BUCKET || 'Axis',
  // Public CDN URL prefix for publicly-accessible files (e.g. profile pictures)
  publicUrl: process.env.R2_PUBLIC_URL || '',
  // Presigned URL expiry in seconds (15 minutes for uploads, 1 hour for downloads)
  uploadUrlExpiry: parseInt(process.env.R2_UPLOAD_URL_EXPIRY || '900', 10),
  downloadUrlExpiry: parseInt(process.env.R2_DOWNLOAD_URL_EXPIRY || '3600', 10),
}));
