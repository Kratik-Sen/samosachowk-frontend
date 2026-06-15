import { Platform, Share } from 'react-native';
import { formatOrderDate, getOrderShortId, summarizeOrderItems } from './orderDisplay';

const FALLBACK_GST_RATE = 5;

const cleanText = (value) =>
  String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapePdfText = (value) =>
  cleanText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const moneyText = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;

const wrapLine = (value, maxLength = 88) => {
  const text = cleanText(value);

  if (text.length <= maxLength) {
    return [text];
  }

  const words = text.split(' ');
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
      return;
    }

    current = next;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
};

const getInvoiceFileName = (order) => `samosa-chowk-invoice-${getOrderShortId(order)}.pdf`;

const buildInvoiceLines = (order) => {
  const gstRate = Number(order?.gst_rate ?? FALLBACK_GST_RATE);
  const lines = [
    { text: 'Samosa Chowk Invoice', size: 18, bold: true, gap: 24 },
    { text: `Invoice: INV-${getOrderShortId(order)}`, bold: true },
    { text: `Order: ${getOrderShortId(order)}` },
    { text: `Date: ${formatOrderDate(order?.createdAt || order?.updatedAt)}` },
    { text: `Vendor: ${order?.customer_name || 'Vendor'}` },
    { text: `Phone: ${order?.customer_phone || 'Not provided'}` },
    { text: `Status: ${order?.status || 'Pending'}` },
    { text: `Payment: ${order?.payment_method || 'COD'} (${order?.payment_status || 'pending'})`, gap: 22 },
    { text: 'Items', bold: true },
  ];

  (order?.items || []).forEach((item, index) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const lineTotal = quantity * price;
    wrapLine(`${index + 1}. ${item.name} x ${quantity} @ ${moneyText(price)} = ${moneyText(lineTotal)}`, 84).forEach(
      (line) => lines.push({ text: line })
    );
  });

  if (!order?.items?.length) {
    lines.push({ text: summarizeOrderItems(order) || 'No item details' });
  }

  lines.push(
    { text: '', gap: 8 },
    { text: `Subtotal: ${moneyText(order?.total_amount)}` },
    { text: `Discount: ${moneyText(order?.discount_amount)}` },
    { text: `GST (${gstRate}%): ${moneyText(order?.gst_amount)}` },
    { text: `Total: ${moneyText(order?.final_amount)}`, size: 14, bold: true }
  );

  return lines;
};

const buildInvoicePdf = (order) => {
  let y = 742;
  const content = buildInvoiceLines(order)
    .slice(0, 40)
    .map((line) => {
      const size = line.size || 10;
      const font = line.bold ? 'F2' : 'F1';
      const command = `BT /${font} ${size} Tf 50 ${y} Td (${escapePdfText(line.text)}) Tj ET`;
      y -= line.gap || 16;
      return command;
    })
    .join('\n');
  const streamContent = `${content}\n`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`,
  ];
  const offsets = [0];
  let pdf = '%PDF-1.4\n';

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
};

const buildInvoiceShareText = (order) =>
  buildInvoiceLines(order)
    .map((line) => line.text)
    .filter(Boolean)
    .join('\n');

export const downloadOrderInvoice = async (order) => {
  const fileName = getInvoiceFileName(order);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([buildInvoicePdf(order)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return `Invoice downloaded: ${fileName}`;
  }

  await Share.share({
    title: fileName,
    message: buildInvoiceShareText(order),
  });

  return 'Invoice details shared. PDF download is available from the web panel.';
};
