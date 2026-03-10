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
  notes?: string | null;
  paymentMethod?: string;
  paidAt?: string | null;
  createdAt: string;
  attendedBy?: string;
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

/**
 * Generates a receipt PDF sized for 80mm thermal printers (226pt width).
 * Also prints well from browser on regular paper.
 */
export function generateReceipt(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const WIDTH = 226; // ~80mm
    const MARGIN = 12;
    const CONTENT_W = WIDTH - MARGIN * 2;

    // Calculate height dynamically
    let estimatedHeight = 280; // header + footer base
    estimatedHeight += data.items.length * 28;
    if (data.notes) estimatedHeight += 30;
    if (data.address) estimatedHeight += 14;
    if (data.phone) estimatedHeight += 14;
    if (data.customerName) estimatedHeight += 14;
    if (data.deliveryAddress) estimatedHeight += 14;
    for (const item of data.items) {
      if (item.notes) estimatedHeight += 12;
    }

    const doc = new PDFDocument({
      size: [WIDTH, Math.max(estimatedHeight, 300)],
      margin: MARGIN,
    });

    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──
    doc.fontSize(14).font('Helvetica-Bold').text(data.restaurantName, { align: 'center' });
    if (data.address) {
      doc.fontSize(7).font('Helvetica').text(data.address, { align: 'center' });
    }
    if (data.phone) {
      doc.fontSize(7).font('Helvetica').text(`Tel: ${data.phone}`, { align: 'center' });
    }
    doc.moveDown(0.3);

    // Dashed separator
    doc.fontSize(7).text('─'.repeat(38), { align: 'center' });
    doc.moveDown(0.2);

    // ── Order info ──
    const orderNum = `#${String(data.orderNumber).padStart(3, '0')}`;
    doc.fontSize(16).font('Helvetica-Bold').text(orderNum, { align: 'center' });
    doc.moveDown(0.1);

    const typeLabel = data.tableName
      ? `Mesa ${data.tableName}`
      : ORDER_TYPE_LABELS[data.orderType] ?? data.orderType;
    doc.fontSize(9).font('Helvetica').text(typeLabel, { align: 'center' });

    if (data.customerName) {
      doc.fontSize(8).text(`Cliente: ${data.customerName}`, { align: 'center' });
    }
    if (data.deliveryAddress) {
      doc.fontSize(7).text(data.deliveryAddress, { align: 'center' });
    }

    doc.fontSize(7).text(formatDate(data.createdAt), { align: 'center' });
    if (data.attendedBy) {
      doc.fontSize(7).text(`Atendio: ${data.attendedBy}`, { align: 'center' });
    }
    doc.moveDown(0.3);

    // Dashed separator
    doc.fontSize(7).text('─'.repeat(38), { align: 'center' });
    doc.moveDown(0.2);

    // ── Items ──
    for (const item of data.items) {
      const qtyStr = `${item.quantity}x`;
      const priceStr = fmt(item.subtotal);

      // Line: qty  name  ......  price
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(qtyStr, MARGIN, doc.y, { continued: true, width: 20 });
      doc.font('Helvetica').text(` ${item.name}`, { continued: true });

      // Right-align price
      const priceWidth = doc.widthOfString(priceStr);
      const nameWidth = doc.widthOfString(`${qtyStr} ${item.name}`);
      const gap = CONTENT_W - nameWidth - priceWidth;
      if (gap > 5) {
        doc.text(' '.repeat(Math.max(1, Math.floor(gap / 2.5))), { continued: true });
      }
      doc.text(priceStr);

      if (item.unitPrice !== item.subtotal) {
        doc.fontSize(6).fillColor('#666666').text(`    c/u ${fmt(item.unitPrice)}`, MARGIN + 20);
        doc.fillColor('#000000');
      }

      if (item.notes) {
        doc.fontSize(6).fillColor('#666666').text(`    * ${item.notes}`, MARGIN + 20);
        doc.fillColor('#000000');
      }
    }

    doc.moveDown(0.3);
    doc.fontSize(7).text('─'.repeat(38), { align: 'center' });
    doc.moveDown(0.2);

    // ── Notes ──
    if (data.notes) {
      doc.fontSize(7).font('Helvetica-Bold').text('Nota: ', { continued: true });
      doc.font('Helvetica').text(data.notes);
      doc.moveDown(0.3);
    }

    // ── Total ──
    doc.fontSize(12).font('Helvetica-Bold').text(`TOTAL  ${fmt(data.total)}`, { align: 'center' });
    doc.moveDown(0.2);

    if (data.paymentMethod) {
      doc.fontSize(8).font('Helvetica').text(
        `Pago: ${PAY_LABELS[data.paymentMethod] ?? data.paymentMethod}`,
        { align: 'center' },
      );
    }
    if (data.paidAt) {
      doc.fontSize(7).text(`Pagado: ${formatDate(data.paidAt)}`, { align: 'center' });
    }

    doc.moveDown(0.5);

    // ── Footer ──
    doc.fontSize(7).text('─'.repeat(38), { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(7).fillColor('#999999').text('Gracias por su preferencia', { align: 'center' });
    doc.text('Tonalli', { align: 'center' });

    doc.end();
  });
}
