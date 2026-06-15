import { images } from '../theme/brand';

export const getOrderShortId = (order) => order?._id?.slice(-6).toUpperCase() || 'ORDER';

export const getOrderProduct = (item) =>
  item?.product && typeof item.product === 'object' ? item.product : null;

export const getOrderProductId = (item) => {
  const product = item?.product;

  if (!product) {
    return '';
  }

  if (typeof product === 'object') {
    return product._id || product.id || '';
  }

  return String(product);
};

export const getOrderImage = (order) => {
  const itemWithImage = (order?.items || []).find((item) => getOrderProduct(item)?.image);
  return getOrderProduct(itemWithImage)?.image || images.heroSamosa;
};

export const summarizeOrderItems = (order) =>
  (order?.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ');

export const formatOrderDate = (value) => {
  if (!value) {
    return 'Recent';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getReorderItems = (order) =>
  (order?.items || [])
    .map((item) => {
      const productId = getOrderProductId(item);

      if (!productId) {
        return null;
      }

      return {
        productId,
        quantity: Math.max(1, Number(item.quantity || 1)),
      };
    })
    .filter(Boolean);
