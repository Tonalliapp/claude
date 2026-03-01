import sharp from 'sharp';

interface ProcessedImage {
  buffer: Buffer;
  mimetype: string;
  extension: string;
}

export async function processImage(
  input: Buffer,
  options: { width?: number; height?: number; quality?: number } = {},
): Promise<ProcessedImage> {
  const { width = 800, height = 800, quality = 80 } = options;

  const buffer = await sharp(input)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  return { buffer, mimetype: 'image/webp', extension: 'webp' };
}
