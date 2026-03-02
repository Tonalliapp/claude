import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
const iconsDir = resolve(publicDir, 'icons');

mkdirSync(iconsDir, { recursive: true });

const svgBuffer = readFileSync(resolve(publicDir, 'tonalli-logo.svg'));

// PWA icons
const sizes = [192, 512];
for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(iconsDir, `icon-${size}.png`));
  console.log(`Generated icon-${size}.png`);
}

// Maskable icon (with padding for safe zone)
const maskableSize = 512;
const padding = Math.round(maskableSize * 0.1);
const innerSize = maskableSize - padding * 2;

await sharp(svgBuffer)
  .resize(innerSize, innerSize)
  .extend({
    top: padding,
    bottom: padding,
    left: padding,
    right: padding,
    background: { r: 10, g: 10, b: 10, alpha: 1 },
  })
  .png()
  .toFile(resolve(iconsDir, 'icon-maskable-512.png'));
console.log('Generated icon-maskable-512.png');

// Apple touch icon (180x180)
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(resolve(publicDir, 'apple-touch-icon.png'));
console.log('Generated apple-touch-icon.png');

// Favicon 32x32
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(resolve(publicDir, 'favicon-32x32.png'));
console.log('Generated favicon-32x32.png');

// OG Image (1200x630)
const ogWidth = 1200;
const ogHeight = 630;
const logoSize = 200;

const ogSvg = `<svg width="${ogWidth}" height="${ogHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A0A0A"/>
      <stop offset="100%" stop-color="#1A1A1A"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b8860b"/>
      <stop offset="100%" stop-color="#daa520"/>
    </linearGradient>
  </defs>
  <rect width="${ogWidth}" height="${ogHeight}" fill="url(#bg)"/>
  <line x1="100" y1="520" x2="1100" y2="520" stroke="#C9A84C" stroke-width="1" opacity="0.3"/>
  <text x="600" y="260" text-anchor="middle" font-family="sans-serif" font-size="72" font-weight="700" fill="#C9A84C">Tonalli</text>
  <text x="600" y="340" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#E5E5E5">Tu restaurante, elevado</text>
  <text x="600" y="400" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#888888">Menú digital QR · Pedidos en tiempo real · POS · Inventario · Reportes</text>
  <text x="600" y="570" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#666666">tonalli.app</text>
</svg>`;

await sharp(Buffer.from(ogSvg))
  .png()
  .toFile(resolve(publicDir, 'og-image.png'));
console.log('Generated og-image.png');

console.log('All icons generated!');
