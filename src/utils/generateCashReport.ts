import PDFDocument from 'pdfkit';

interface ReportData {
  restaurantName: string;
  employeeName: string;
  openedAt: string;
  closedAt: string;
  openingAmount: number;
  closingAmount: number;
  expectedAmount: number;
  salesTotal: number;
  difference: number;
  totalTransactions: number;
  breakdown: Record<string, { count: number; total: number }>;
  bySource: Record<string, { count: number; total: number }>;
  movements: { type: string; amount: number; description?: string | null; user: { name: string }; createdAt: string }[];
  signedBy: string;
  signedAt: string;
  notes?: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

const SOURCE_LABELS: Record<string, string> = {
  tonalli: 'Tonalli',
  yesswera: 'Yesswera',
};

const MOV_LABELS: Record<string, string> = {
  deposit: 'Fondeo',
  withdrawal: 'Retiro',
  expense: 'Gasto',
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

export function generateCashReport(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Uint8Array[] = [];

    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_W = 612;
    const MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(data.restaurantName, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).font('Helvetica').text('Reporte de Cierre de Caja', { align: 'center' });
    doc.moveDown(0.5);

    // Line separator
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);

    // Shift info
    doc.fontSize(10).font('Helvetica-Bold').text('Empleado: ', { continued: true }).font('Helvetica').text(data.employeeName);
    doc.font('Helvetica-Bold').text('Apertura: ', { continued: true }).font('Helvetica').text(formatDate(data.openedAt));
    doc.font('Helvetica-Bold').text('Cierre: ', { continued: true }).font('Helvetica').text(formatDate(data.closedAt));
    if (data.notes) {
      doc.font('Helvetica-Bold').text('Notas: ', { continued: true }).font('Helvetica').text(data.notes);
    }
    doc.moveDown(0.8);

    // Summary box
    doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN');
    doc.moveDown(0.3);

    const summaryRows = [
      ['Monto de Apertura', fmt(data.openingAmount)],
      ['Total Ventas', fmt(data.salesTotal)],
      ['Monto Esperado', fmt(data.expectedAmount)],
      ['Monto Contado', fmt(data.closingAmount)],
      ['Diferencia', `${data.difference >= 0 ? '+' : ''}${fmt(data.difference)}`],
      ['Total Transacciones', String(data.totalTransactions)],
    ];

    drawTable(doc, summaryRows, MARGIN, CONTENT_W);
    doc.moveDown(0.8);

    // Breakdown by method
    const methodEntries = Object.entries(data.breakdown).filter(([, v]) => v.count > 0);
    if (methodEntries.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('DESGLOSE POR METODO DE PAGO');
      doc.moveDown(0.3);
      const rows = methodEntries.map(([key, val]) => [
        METHOD_LABELS[key] ?? key,
        `${val.count} cobros`,
        fmt(val.total),
      ]);
      drawTable(doc, rows, MARGIN, CONTENT_W);
      doc.moveDown(0.8);
    }

    // Breakdown by source
    const sourceEntries = Object.entries(data.bySource).filter(([, v]) => v.count > 0);
    if (sourceEntries.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('DESGLOSE POR FUENTE');
      doc.moveDown(0.3);
      const rows = sourceEntries.map(([key, val]) => [
        SOURCE_LABELS[key] ?? key,
        `${val.count} cobros`,
        fmt(val.total),
      ]);
      drawTable(doc, rows, MARGIN, CONTENT_W);
      doc.moveDown(0.8);
    }

    // Movements
    if (data.movements.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('MOVIMIENTOS DE CAJA');
      doc.moveDown(0.3);
      const rows = data.movements.map((m) => [
        MOV_LABELS[m.type] ?? m.type,
        m.description || '—',
        `${m.type === 'deposit' ? '+' : '-'}${fmt(Number(m.amount))}`,
        m.user.name,
      ]);
      drawTable(doc, rows, MARGIN, CONTENT_W);
      doc.moveDown(0.8);
    }

    // Digital Signature Section
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);

    doc.fontSize(12).font('Helvetica-Bold').text('FIRMA DIGITAL');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Yo, ${data.signedBy}, declaro que he revisado los datos de este reporte de cierre de caja y confirmo que la informacion aqui presentada es correcta.`);
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Firmado por: ', { continued: true }).font('Helvetica').text(data.signedBy);
    doc.font('Helvetica-Bold').text('Fecha de firma: ', { continued: true }).font('Helvetica').text(formatDate(data.signedAt));
    doc.moveDown(1);

    // Footer
    doc.fontSize(8).fillColor('#999999').text(`Generado automaticamente por Tonalli — ${formatDate(new Date().toISOString())}`, { align: 'center' });

    doc.end();
  });
}

function drawTable(doc: InstanceType<typeof PDFDocument>, rows: string[][], x: number, width: number) {
  const colWidth = width / (rows[0]?.length ?? 1);
  const y0 = doc.y;

  for (let r = 0; r < rows.length; r++) {
    const rowY = y0 + r * 20;

    // Alternate row background
    if (r % 2 === 0) {
      doc.rect(x, rowY - 2, width, 18).fill('#f5f5f5');
    }

    doc.fillColor('#333333').fontSize(10).font('Helvetica');
    for (let c = 0; c < rows[r].length; c++) {
      const align = c === rows[r].length - 1 ? 'right' : 'left';
      const cellX = x + c * colWidth;
      doc.text(rows[r][c], cellX + 4, rowY, { width: colWidth - 8, align });
    }
  }

  doc.y = y0 + rows.length * 20 + 4;
}
