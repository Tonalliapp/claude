import QRCode from 'qrcode';
import sharp from 'sharp';
import { env } from '../config/env';

export async function generateTableQR(slug: string, tableNumber: number): Promise<string> {
  const url = `${env.MENU_BASE_URL}/${slug}?mesa=${tableNumber}`;
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  });
}

export function getTableMenuURL(slug: string, tableNumber: number): string {
  return `${env.MENU_BASE_URL}/${slug}?mesa=${tableNumber}`;
}

export async function generateQRBuffer(slug: string, tableNumber: number, size: number): Promise<Buffer> {
  const url = `${env.MENU_BASE_URL}/${slug}?mesa=${tableNumber}`;
  return QRCode.toBuffer(url, {
    width: size,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
    errorCorrectionLevel: 'H', // High correction to survive logo overlay
  });
}

export interface CustomQROptions {
  /** QR size as percentage of canvas (40-80) */
  qrSize: number;
  /** Position: center, top-left, top-right, bottom-left, bottom-right */
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Custom X offset (0-100, percentage). Overrides position if provided with customY */
  customX?: number;
  /** Custom Y offset (0-100, percentage). Overrides position if provided with customX */
  customY?: number;
  /** QR opacity (0.5-1.0) */
  opacity: number;
  /** Output canvas size in pixels */
  canvasSize: number;
  /** Table number label on the QR */
  showTableNumber: boolean;
}

const defaultOptions: CustomQROptions = {
  qrSize: 60,
  position: 'center',
  opacity: 0.92,
  canvasSize: 1024,
  showTableNumber: true,
};

export interface BrandedQROptions {
  layout: 'logo-left' | 'logo-right';
  showTableNumber: boolean;
}

// Tonalli sun logo SVG — matches the brand identity (sun core + rings + rays + jade accents + diamonds)
function tonalliSunSvg(size: number): string {
  const s = size;
  const c = s / 2; // center
  const scale = s / 200; // scale factor from 200px base
  const sc = (v: number) => Math.round(v * scale);

  return `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
    <defs>
      <radialGradient id="sc" cx="40%" cy="35%">
        <stop offset="0%" stop-color="#E2C97E"/>
        <stop offset="50%" stop-color="#C9A84C"/>
        <stop offset="100%" stop-color="#9A7B2F"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="100" r="60" stroke="#C0C0C0" stroke-width="0.6" opacity="0.08"/>
    <circle cx="100" cy="100" r="50" stroke="#4A8C6F" stroke-width="0.8" opacity="0.2"/>
    <circle cx="100" cy="100" r="40" stroke="#C9A84C" stroke-width="1" opacity="0.3"/>
    <g stroke="#C9A84C" stroke-width="1.2" stroke-linecap="round" opacity="0.55">
      <line x1="100" y1="30" x2="100" y2="14"/>
      <line x1="135" y1="39.5" x2="143" y2="25.6"/>
      <line x1="160.5" y1="65" x2="174.4" y2="57"/>
      <line x1="170" y1="100" x2="186" y2="100"/>
      <line x1="160.5" y1="135" x2="174.4" y2="143"/>
      <line x1="135" y1="160.5" x2="143" y2="174.4"/>
      <line x1="100" y1="170" x2="100" y2="186"/>
      <line x1="65" y1="160.5" x2="57" y2="174.4"/>
      <line x1="39.5" y1="135" x2="25.6" y2="143"/>
      <line x1="30" y1="100" x2="14" y2="100"/>
      <line x1="39.5" y1="65" x2="25.6" y2="57"/>
      <line x1="65" y1="39.5" x2="57" y2="25.6"/>
    </g>
    <g fill="#4A8C6F" opacity="0.35">
      <ellipse cx="117.5" cy="32" rx="2" ry="4" transform="rotate(15 117.5 32)"/>
      <ellipse cx="168" cy="82.5" rx="2" ry="4" transform="rotate(105 168 82.5)"/>
      <ellipse cx="82.5" cy="168" rx="2" ry="4" transform="rotate(195 82.5 168)"/>
      <ellipse cx="32" cy="117.5" rx="2" ry="4" transform="rotate(285 32 117.5)"/>
    </g>
    <g fill="#C9A84C" opacity="0.7">
      <polygon points="100,6 103,10 100,14 97,10"/>
      <polygon points="194,100 190,103 186,100 190,97"/>
      <polygon points="100,194 103,190 100,186 97,190"/>
      <polygon points="6,100 10,103 14,100 10,97"/>
    </g>
    <circle cx="100" cy="100" r="26" fill="url(#sc)"/>
  </svg>`;
}

export async function generateBrandedQR(
  slug: string,
  tableNumber: number,
  logoBuffer: Buffer,
  options: BrandedQROptions = { layout: 'logo-left', showTableNumber: true },
): Promise<Buffer> {
  const W = 2048;
  const H = 1400;
  const layout = options.layout;
  const showLabel = options.showTableNumber;
  // Font available in Alpine with ttf-dejavu + font-noto packages
  const FONT = `'DejaVu Sans',sans-serif`;
  const FONT_SERIF = `'DejaVu Serif','DejaVu Sans',serif`;

  // Generate QR at 520px
  const qrSize = 520;
  const qrBuffer = await generateQRBuffer(slug, tableNumber, qrSize);

  // ---- Restaurant logo — adapt to actual aspect ratio ----
  const logoMeta = await sharp(logoBuffer).metadata();
  const logoOrigW = logoMeta.width || 1;
  const logoOrigH = logoMeta.height || 1;
  const logoAspect = logoOrigW / logoOrigH;

  // Target: fit within 760w x 620h panel area, respecting aspect ratio
  const logoMaxW = 760;
  const logoMaxH = 620;
  let logoW: number, logoH: number;
  if (logoAspect > logoMaxW / logoMaxH) {
    // wider than target — constrain by width
    logoW = logoMaxW;
    logoH = Math.round(logoMaxW / logoAspect);
  } else {
    // taller than target — constrain by height
    logoH = logoMaxH;
    logoW = Math.round(logoMaxH * logoAspect);
  }

  const resizedLogo = await sharp(logoBuffer)
    .resize(logoW, logoH, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 0 } })
    .png()
    .toBuffer();

  // ---- QR code — clean white rounded card ----
  const qrPad = 44;
  const qrBoxSize = qrSize + qrPad * 2;
  const qrBoxRound = 24;

  const qrBoxSvg = `<svg width="${qrBoxSize}" height="${qrBoxSize}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${qrBoxSize}" height="${qrBoxSize}"
      rx="${qrBoxRound}" ry="${qrBoxRound}" fill="white"/>
  </svg>`;
  const qrBox = await sharp(Buffer.from(qrBoxSvg))
    .composite([{ input: qrBuffer, left: qrPad, top: qrPad }])
    .png()
    .toBuffer();

  // Table label pill
  let labelBuffer: Buffer | null = null;
  const labelW = 300;
  const labelH = 60;
  if (showLabel) {
    const labelSvg = `<svg width="${labelW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${labelW}" height="${labelH}" rx="30" ry="30" fill="#111111" stroke="#C9A84C" stroke-width="1.5"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="${FONT_SERIF}" font-size="26" fill="#C9A84C" letter-spacing="4">
        Mesa ${tableNumber}
      </text>
    </svg>`;
    labelBuffer = Buffer.from(labelSvg);
  }

  // Tonalli sun logo rendered to PNG
  const sunSize = 100;
  const sunPng = await sharp(Buffer.from(tonalliSunSvg(sunSize))).png().toBuffer();

  // Layout dimensions
  const brandH = 140;
  const inset = 44;
  const innerW = W - inset * 2;
  const innerH = H - inset * 2;
  const dividerX = Math.round(W / 2);
  const brandCenterY = H - inset - Math.round(brandH / 2);

  // Background SVG with all vector elements
  const bgSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#C9A84C"/>
        <stop offset="50%" stop-color="#E2C97E"/>
        <stop offset="100%" stop-color="#9A7B2F"/>
      </linearGradient>
      <linearGradient id="divider-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#C9A84C" stop-opacity="0"/>
        <stop offset="15%" stop-color="#C9A84C" stop-opacity="0.2"/>
        <stop offset="50%" stop-color="#4A8C6F" stop-opacity="0.12"/>
        <stop offset="85%" stop-color="#C9A84C" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#C9A84C" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#0A0A0A"/>
    <ellipse cx="${dividerX}" cy="${Math.round((H - brandH) / 2)}" rx="600" ry="400" fill="#C9A84C" opacity="0.015"/>
    <rect x="${inset}" y="${inset}" width="${innerW}" height="${innerH}" rx="20" ry="20"
      fill="none" stroke="url(#gold-grad)" stroke-width="2.5" opacity="0.4"/>
    <line x1="${dividerX}" y1="${inset + 50}" x2="${dividerX}" y2="${H - inset - brandH - 10}"
      stroke="url(#divider-grad)" stroke-width="1.5"/>
    <line x1="${inset + 100}" y1="${H - inset - brandH}" x2="${W - inset - 100}" y2="${H - inset - brandH}"
      stroke="#C9A84C" stroke-width="0.7" opacity="0.12"/>
    <text x="${dividerX + 56}" y="${brandCenterY - 8}" text-anchor="middle"
      font-family="${FONT_SERIF}" font-size="40" fill="#C9A84C" letter-spacing="14" opacity="0.85">
      TONALLI
    </text>
    <text x="${dividerX + 56}" y="${brandCenterY + 34}" text-anchor="middle"
      font-family="${FONT}" font-size="19" fill="#6A6A6A" letter-spacing="6">
      tonalli.app
    </text>
  </svg>`;

  const bgPng = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // Compute positions
  const leftCX = Math.round(W * 0.25);
  const rightCX = Math.round(W * 0.75);
  const contentAreaH = H - inset * 2 - brandH;
  const contentCY = inset + Math.round(contentAreaH / 2);

  const logoCX = layout === 'logo-left' ? leftCX : rightCX;
  const qrCX = layout === 'logo-left' ? rightCX : leftCX;

  const logoLeft = Math.round(logoCX - logoW / 2);
  const logoTop = Math.round(contentCY - logoH / 2);
  const qrLeft = Math.round(qrCX - qrBoxSize / 2);
  const qrTop = Math.round(contentCY - qrBoxSize / 2) - (showLabel ? 24 : 0);

  // Sun icon left of "TONALLI" text
  const sunLeft = dividerX + 56 - Math.round(240 / 2) - sunSize - 8;
  const sunTop = brandCenterY - Math.round(sunSize / 2);

  const composites: sharp.OverlayOptions[] = [
    { input: resizedLogo, left: logoLeft, top: logoTop },
    { input: qrBox, left: qrLeft, top: qrTop },
    { input: sunPng, left: sunLeft, top: sunTop },
  ];

  if (labelBuffer) {
    const labelLeft = Math.round(qrCX - labelW / 2);
    const labelTop = qrTop + qrBoxSize + 20;
    composites.push({ input: labelBuffer, left: labelLeft, top: labelTop });
  }

  return sharp(bgPng)
    .composite(composites)
    .png({ quality: 90 })
    .toBuffer();
}

export async function generateCustomQR(
  slug: string,
  tableNumber: number,
  logoBuffer: Buffer,
  options: Partial<CustomQROptions> = {},
): Promise<Buffer> {
  const opts = { ...defaultOptions, ...options };

  // Clamp values to safe ranges
  opts.qrSize = Math.max(40, Math.min(80, opts.qrSize));
  opts.opacity = Math.max(0.5, Math.min(1.0, opts.opacity));
  opts.canvasSize = Math.max(512, Math.min(2048, opts.canvasSize));

  const canvas = opts.canvasSize;
  const qrPixels = Math.round(canvas * (opts.qrSize / 100));

  // Generate QR code at the required size with high error correction
  const qrBuffer = await generateQRBuffer(slug, tableNumber, qrPixels);

  // Resize logo to fill the canvas
  const resizedLogo = await sharp(logoBuffer)
    .resize(canvas, canvas, { fit: 'cover' })
    .png()
    .toBuffer();

  // Apply opacity to QR by adding alpha channel
  // Create the QR with semi-transparent white background
  const qrMeta = await sharp(qrBuffer).metadata();
  const qrWidth = qrMeta.width!;
  const qrHeight = qrMeta.height!;

  let qrWithOpacity: Buffer;
  if (opts.opacity < 1.0) {
    // Create a white background with opacity
    const alphaByte = Math.round(opts.opacity * 255);
    const bgBuffer = await sharp({
      create: {
        width: qrWidth,
        height: qrHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: opts.opacity },
      },
    }).png().toBuffer();

    // Composite QR onto semi-transparent white bg
    qrWithOpacity = await sharp(bgBuffer)
      .composite([{
        input: await sharp(qrBuffer)
          .ensureAlpha(opts.opacity)
          .toBuffer(),
        blend: 'over',
      }])
      .png()
      .toBuffer();
  } else {
    qrWithOpacity = qrBuffer;
  }

  // Calculate position
  let left: number;
  let top: number;

  if (opts.customX !== undefined && opts.customY !== undefined) {
    // Custom position (percentage based)
    const maxLeft = canvas - qrWidth;
    const maxTop = canvas - qrHeight;
    left = Math.round(maxLeft * (Math.max(0, Math.min(100, opts.customX)) / 100));
    top = Math.round(maxTop * (Math.max(0, Math.min(100, opts.customY)) / 100));
  } else {
    const margin = Math.round(canvas * 0.03); // 3% margin from edges
    switch (opts.position) {
      case 'top-left':
        left = margin;
        top = margin;
        break;
      case 'top-right':
        left = canvas - qrWidth - margin;
        top = margin;
        break;
      case 'bottom-left':
        left = margin;
        top = canvas - qrHeight - margin;
        break;
      case 'bottom-right':
        left = canvas - qrWidth - margin;
        top = canvas - qrHeight - margin;
        break;
      case 'center':
      default:
        left = Math.round((canvas - qrWidth) / 2);
        top = Math.round((canvas - qrHeight) / 2);
        break;
    }
  }

  // Add table number label if requested
  let labelOverlay: Buffer | null = null;
  if (opts.showTableNumber) {
    const labelHeight = Math.round(canvas * 0.06);
    const fontSize = Math.round(labelHeight * 0.7);
    const labelWidth = Math.round(qrWidth * 0.8);
    const labelSvg = `<svg width="${labelWidth}" height="${labelHeight}">
      <rect x="0" y="0" width="${labelWidth}" height="${labelHeight}" rx="${Math.round(labelHeight / 4)}" fill="rgba(10,10,10,0.85)"/>
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">
        Mesa ${tableNumber}
      </text>
    </svg>`;
    labelOverlay = Buffer.from(labelSvg);
  }

  // Compose final image: logo + QR + optional label
  const composites: sharp.OverlayOptions[] = [
    { input: qrWithOpacity, left, top },
  ];

  if (labelOverlay) {
    const labelWidth = Math.round(qrWidth * 0.8);
    const labelLeft = left + Math.round((qrWidth - labelWidth) / 2);
    const labelTop = top + qrHeight + Math.round(canvas * 0.01);
    // Only add label if it fits within the canvas
    if (labelTop + Math.round(canvas * 0.06) <= canvas) {
      composites.push({ input: labelOverlay, left: labelLeft, top: labelTop });
    }
  }

  return sharp(resizedLogo)
    .composite(composites)
    .png({ quality: 90 })
    .toBuffer();
}
