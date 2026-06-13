export const getVendorPhone = (order) => {
  const phone = order?.user?.phone || order?.customer_phone || '';
  return String(phone || '').trim();
};

export const getVendorContactText = (order) => {
  const phone = getVendorPhone(order);
  return phone ? `Vendor phone: ${phone}` : 'Vendor phone not available';
};

export const getDeliveryStopSubtitle = (order, fallback = 'No address note') => {
  const address = order?.delivery_address?.location || fallback;
  return `${address} - ${getVendorContactText(order)}`;
};
