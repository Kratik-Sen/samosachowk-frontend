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
const PDF_IMAGE_WIDTH = 132;
const PDF_IMAGE_HEIGHT = 92;

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

const getInvoiceDishImage = (order) => {
  const itemWithImage = (order?.items || []).find(
    (item) => item?.product && typeof item.product === 'object' && item.product.image
  );

  return itemWithImage?.product?.image || '';
};

const stringToBytes = (value) => {
  const bytes = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }

  return bytes;
};

const concatBytes = (parts) => {
  const normalizedParts = parts.map((part) => (typeof part === 'string' ? stringToBytes(part) : part));
  const totalLength = normalizedParts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  normalizedParts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
};

const base64ToBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const bytesToBase64 = (bytes) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const hasSecond = index + 1 < bytes.length;
    const hasThird = index + 2 < bytes.length;
    const triplet = (first << 16) | ((second || 0) << 8) | (third || 0);

    output += alphabet[(triplet >> 18) & 0x3f];
    output += alphabet[(triplet >> 12) & 0x3f];
    output += hasSecond ? alphabet[(triplet >> 6) & 0x3f] : '=';
    output += hasThird ? alphabet[triplet & 0x3f] : '=';
  }

  return output;
};

const loadInvoiceImage = async (order) => {
  const imageUrl = getInvoiceDishImage(order);

  if (Platform.OS !== 'web' || !imageUrl || typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  try {
    const image = await new Promise((resolve, reject) => {
      const nextImage = new window.Image();
      nextImage.crossOrigin = 'anonymous';
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Unable to load invoice image'));
      nextImage.src = imageUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 360;
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;
    context.drawImage(image, x, y, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);

    return {
      bytes: base64ToBytes(dataUrl.split(',')[1]),
      width: canvas.width,
      height: canvas.height,
    };
  } catch (error) {
    return null;
  }
};

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

const buildInvoicePdf = (order, invoiceImage = null) => {
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
  const imageContent = invoiceImage
    ? `q ${PDF_IMAGE_WIDTH} 0 0 ${PDF_IMAGE_HEIGHT} 430 650 cm /Im1 Do Q\nBT /F2 9 Tf 430 638 Td (Dish image) Tj ET\n`
    : '';
  const streamContent = `${imageContent}${content}\n`;
  const resources = invoiceImage
    ? '/Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 7 0 R >> >>'
    : '/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >>';

  const objects = [
    ['1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'],
    ['2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'],
    [`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ${resources} /Contents 6 0 R >>\nendobj\n`],
    ['4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'],
    ['5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n'],
    [`6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`],
  ];

  if (invoiceImage) {
    objects.push([
      `7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${invoiceImage.width} /Height ${invoiceImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${invoiceImage.bytes.length} >>\nstream\n`,
      invoiceImage.bytes,
      '\nendstream\nendobj\n',
    ]);
  }

  const offsets = [0];
  const pdfParts = ['%PDF-1.4\n'];
  let pdfLength = '%PDF-1.4\n'.length;

  objects.forEach((object) => {
    const objectBytes = concatBytes(object);
    offsets.push(pdfLength);
    pdfParts.push(objectBytes);
    pdfLength += objectBytes.length;
  });

  const xrefStart = pdfLength;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  pdfParts.push(xref);
  return concatBytes(pdfParts);
};

const buildInvoiceShareText = (order) =>
  buildInvoiceLines(order)
    .map((line) => line.text)
    .filter(Boolean)
    .join('\n');

export const downloadOrderInvoice = async (order) => {
  const fileName = getInvoiceFileName(order);
  const pdfBytes = buildInvoicePdf(order);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const invoiceImage = await loadInvoiceImage(order);
    const blob = new Blob([buildInvoicePdf(order, invoiceImage)], { type: 'application/pdf' });
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

  try {
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');
    const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    const fileUri = `${directory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, bytesToBase64(pdfBytes), {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: fileName,
        UTI: 'com.adobe.pdf',
      });
      return `Invoice PDF ready: ${fileName}`;
    }

    await Share.share({
      title: fileName,
      url: fileUri,
      message: fileUri,
    });

    return `Invoice PDF saved: ${fileName}`;
  } catch (error) {
    await Share.share({
      title: fileName,
      message: buildInvoiceShareText(order),
    });
  }

  return 'Invoice PDF could not be opened, so invoice details were shared instead.';
};
