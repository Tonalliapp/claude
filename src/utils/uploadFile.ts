import crypto from 'crypto';
import { minio } from '../config/storage';
import { env } from '../config/env';

export async function uploadToStorage(
  buffer: Buffer,
  folder: string,
  mimetype: string,
  extension: string,
): Promise<string> {
  const filename = `${folder}/${crypto.randomUUID()}.${extension}`;

  await minio.putObject(env.MINIO_BUCKET, filename, buffer, buffer.length, {
    'Content-Type': mimetype,
  });

  if (env.STORAGE_PUBLIC_URL) {
    return `${env.STORAGE_PUBLIC_URL}/${filename}`;
  }

  const protocol = env.MINIO_USE_SSL ? 'https' : 'http';
  return `${protocol}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${env.MINIO_BUCKET}/${filename}`;
}
