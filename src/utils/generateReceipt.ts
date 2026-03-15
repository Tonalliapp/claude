import PDFDocument from 'pdfkit';

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string | null;
}

interface ReceiptData {
  restaurantName: string;
  address?: string;
  phone?: string;
  orderNumber: number;
  orderType: string;
  tableName?: string;
  customerName?: string;
  deliveryAddress?: string;
  items: ReceiptItem[];
  subtotal: number;
  total: number;
  ivaEnabled?: boolean;
  ivaRate?: number;
  ivaAmount?: number;
  notes?: string | null;
  paymentMethod?: string;
  tipAmount?: number;
  paidAt?: string | null;
  createdAt: string;
  attendedBy?: string;
  cashierName?: string;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Mesa',
  takeout: 'Para Llevar',
  counter: 'Mostrador',
  delivery: 'Domicilio',
};

const PAY_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });
}

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ── Number to words (Spanish) ──

const ONES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE',
  'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
const TENS = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertHundreds(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const h = Math.floor(n / 100);
  const t = n % 100;
  let result = HUNDREDS[h];
  if (t > 0) {
    if (h > 0) result += ' ';
    if (t <= 20) {
      result += ONES[t];
    } else if (t < 30) {
      result += TENS[2] + ONES[t % 10].toLowerCase();
    } else {
      const tens = Math.floor(t / 10);
      const ones = t % 10;
      result += TENS[tens];
      if (ones > 0) result += ' Y ' + ONES[ones];
    }
  }
  return result;
}

function numberToWords(n: number): string {
  const int = Math.floor(n);
  const cents = Math.round((n - int) * 100);

  let words = '';
  if (int === 0) {
    words = 'CERO';
  } else if (int === 100) {
    words = 'CIEN';
  } else {
    const thousands = Math.floor(int / 1000);
    const remainder = int % 1000;
    if (thousands > 0) {
      words += thousands === 1 ? 'MIL ' : convertHundreds(thousands) + ' MIL ';
    }
    if (remainder > 0 || thousands === 0) {
      words += convertHundreds(remainder);
    }
  }

  return `SON:${words.trim()} PESOS ${String(cents).padStart(2, '0')}/100 M.N.`;
}

// ── PDF Generator ──

export function generateReceipt(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const WIDTH = 226; // ~80mm thermal
    const M = 10; // margin
    const CW = WIDTH - M * 2; // content width

    // Estimate height
    let h = 380;
    h += data.items.length * 24;
    if (data.notes) h += 20;
    if (data.address) h += 12;
    if (data.phone) h += 12;
    if (data.customerName) h += 12;
    if (data.deliveryAddress) h += 12;
    if (data.ivaEnabled) h += 24;
    if (data.tipAmount && data.tipAmount > 0) h += 12;
    if (data.cashierName) h += 12;
    for (const item of data.items) {
      if (item.notes) h += 10;
      if (item.unitPrice !== item.subtotal) h += 10;
    }

    const doc = new PDFDocument({ size: [WIDTH, Math.max(h, 300)], margin: M });
    const chunks: Uint8Array[] = [];
    doc.on('data', (c: Uint8Array) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Helper: draw a dashed line using ASCII minus signs (safe in all fonts)
    const sep = () => {
      const y = doc.y;
      doc.save()
        .moveTo(M, y)
        .lineTo(WIDTH - M, y)
        .dash(3, { space: 2 })
        .lineWidth(0.5)
        .stroke('#999999')
        .restore();
      doc.y = y + 6;
    };

    // Helper: text row with left + right columns
    const row = (left: string, right: string, opts?: { fontSize?: number; bold?: boolean }) => {
      const fs = opts?.fontSize ?? 7;
      const font = opts?.bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.fontSize(fs).font(font);
      const rw = doc.widthOfString(right);
      doc.text(left, M, doc.y, { width: CW - rw - 4 });
      // go back up to same line and place right text
      const lineH = doc.currentLineHeight();
      doc.text(right, M, doc.y - lineH, { width: CW, align: 'right' });
    };

    // Helper: centered text
    const center = (text: string, opts?: { fontSize?: number; bold?: boolean; color?: string }) => {
      const fs = opts?.fontSize ?? 7;
      const font = opts?.bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.fontSize(fs).font(font).fillColor(opts?.color ?? '#000000').text(text, M, doc.y, { width: CW, align: 'center' });
    };

    // ═══════════════════════════════════
    // HEADER
    // ═══════════════════════════════════
    center(data.restaurantName, { fontSize: 12, bold: true });
    if (data.address) center(data.address);
    if (data.phone) center(`Tel: ${data.phone}`);
    doc.moveDown(0.3);

    sep();

    // ORDER INFO
    center(`#${String(data.orderNumber).padStart(3, '0')}`, { fontSize: 14, bold: true });
    doc.moveDown(0.1);

    const typeLabel = data.tableName
      ? `Mesa ${data.tableName}`
      : ORDER_TYPE_LABELS[data.orderType] ?? data.orderType;
    center(typeLabel, { fontSize: 8 });

    if (data.customerName) center(`Cliente: ${data.customerName}`, { fontSize: 7 });
    if (data.deliveryAddress) center(data.deliveryAddress, { fontSize: 6 });

    center(formatDate(data.createdAt));
    if (data.paidAt) center(formatDate(data.paidAt));
    if (data.attendedBy) center(`Atendio: ${data.attendedBy}`);
    if (data.cashierName) center(`Cajero: ${data.cashierName}`);
    doc.moveDown(0.3);

    sep();

    // ═══════════════════════════════════
    // ITEMS — table layout with explicit columns
    // ═══════════════════════════════════
    // Column widths: qty(18) + name(remaining) + price(52)
    const COL_QTY = 18;
    const COL_PRICE = 50;
    const COL_NAME = CW - COL_QTY - COL_PRICE - 4;

    for (const item of data.items) {
      const qtyStr = `${item.quantity}`;
      const priceStr = fmt(item.subtotal);
      const y = doc.y;

      // Quantity
      doc.fontSize(8).font('Helvetica-Bold').text(qtyStr, M, y, { width: COL_QTY });

      // Name — allow wrapping within its column
      const nameY = doc.y;
      doc.y = y;
      doc.fontSize(8).font('Helvetica').text(item.name, M + COL_QTY, y, { width: COL_NAME });
      const afterNameY = doc.y;

      // Price — right-aligned, at top of row
      doc.fontSize(8).font('Helvetica').text(priceStr, M + COL_QTY + COL_NAME + 4, y, { width: COL_PRICE, align: 'right' });

      // Advance to whichever was taller
      doc.y = Math.max(afterNameY, y + 10);

      // Unit price hint (when qty > 1)
      if (item.unitPrice !== item.subtotal) {
        doc.fontSize(6).fillColor('#666666').text(`  c/u ${fmt(item.unitPrice)}`, M + COL_QTY);
        doc.fillColor('#000000');
      }

      // Item notes
      if (item.notes) {
        doc.fontSize(6).fillColor('#666666').text(`  * ${item.notes}`, M + COL_QTY);
        doc.fillColor('#000000');
      }

      doc.moveDown(0.15);
    }

    doc.moveDown(0.2);
    sep();

    // ═══════════════════════════════════
    // NOTES
    // ═══════════════════════════════════
    if (data.notes) {
      doc.fontSize(7).font('Helvetica-Bold').text('Nota:', M, doc.y, { width: CW, continued: true });
      doc.font('Helvetica').text(` ${data.notes}`);
      doc.moveDown(0.3);
    }

    // ═══════════════════════════════════
    // TOTALS
    // ═══════════════════════════════════
    if (data.ivaEnabled && data.ivaAmount != null) {
      row(`Subtotal:`, fmt(data.subtotal), { fontSize: 8 });
      row(`IVA (${data.ivaRate ?? 16}%):`, fmt(data.ivaAmount), { fontSize: 8 });
      doc.moveDown(0.2);
    }

    center(`TOTAL:  ${fmt(data.total)}`, { fontSize: 12, bold: true });
    doc.moveDown(0.1);

    if (data.tipAmount && data.tipAmount > 0) {
      center(`Propina: ${fmt(data.tipAmount)}`, { fontSize: 7 });
    }

    doc.moveDown(0.2);
    sep();

    // Total in words
    center(numberToWords(data.total), { fontSize: 6 });
    doc.moveDown(0.1);

    if (!data.ivaEnabled) {
      center(`Subtotal: ${fmt(data.subtotal)}    IVA: $0.00`);
    }

    if (data.paymentMethod) {
      center(`Pago: ${PAY_LABELS[data.paymentMethod] ?? data.paymentMethod}`, { fontSize: 7 });
    }

    doc.moveDown(0.3);

    // ═══════════════════════════════════
    // DISCLAIMERS
    // ═══════════════════════════════════
    center('ESTE NO ES UN COMPROBANTE FISCAL', { fontSize: 7, bold: true });
    center('PROPINA NO INCLUIDA', { fontSize: 7, bold: true });
    doc.moveDown(0.3);

    // ═══════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════
    sep();
    center('Gracias por su preferencia', { fontSize: 7, color: '#999999' });
    center('tonalli.app', { fontSize: 7, color: '#999999' });

    doc.end();
  });
}
