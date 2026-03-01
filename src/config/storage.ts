import { Client as MinioClient } from 'minio';
import { env } from './env';

export const minio = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export async function initStorage(): Promise<void> {
  try {
    const exists = await minio.bucketExists(env.MINIO_BUCKET);
    if (!exists) {
      await minio.makeBucket(env.MINIO_BUCKET, 'us-east-1');
      // Public read policy for assets
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${env.MINIO_BUCKET}/*`],
          },
        ],
      };
      await minio.setBucketPolicy(env.MINIO_BUCKET, JSON.stringify(policy));
    }
    console.log(`[Storage] MinIO bucket "${env.MINIO_BUCKET}" ready`);
  } catch (error) {
    console.error('[Storage] MinIO init failed:', error);
  }
}
