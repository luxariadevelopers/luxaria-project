import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const s3Prefix = (process.env.S3_PREFIX || 'luxaria-developers/').replace(/^\//, '');
const normalizedPrefix = s3Prefix.endsWith('/') ? s3Prefix : `${s3Prefix}/`;

export const config = {
  port: Number(process.env.PORT || 9000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:9017/luxaria',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  useLocalUploads: process.env.USE_LOCAL_UPLOADS === 'true',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET || 'classiccart-storage-bucket',
    prefix: normalizedPrefix,
    retentionYears: Number(process.env.S3_RETENTION_YEARS || 15),
    objectLock: process.env.S3_OBJECT_LOCK === 'true',
  },
};
