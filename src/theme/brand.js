export const colors = {
  cream: '#FDFCF6',
  creamAlt: '#FFFAEB',
  surface: '#FFF8E1',
  white: '#FFFFFF',
  ink: '#1C1C1C',
  muted: '#70665A',
  softText: '#8A7A68',
  border: '#EADFC8',
  red: '#D32F2F',
  redDark: '#C62828',
  yellow: '#FFC107',
  amber: '#FFA000',
  green: '#2E7D32',
  blue: '#3080FF',
  shadow: '#0000001A',
};

export const images = {
  logo: require('../../assets/samosa-logo.png'),
  deliveryIcon: require('../../assets/delivery-icon.png'),
  shopIcon: require('../../assets/shop-icon.png'),
  heroSamosa:
    'https://media.istockphoto.com/id/1299380316/photo/samosa-with-chutney-in-plate-asian-breakfast-aloo-samosa.jpg',
  samosaChaat:
    'https://snapcalorie-webflow-website.s3.us-east-2.amazonaws.com/media/food_pics_v2/medium/samosa_chaat.jpg',
  paneerSamosa: 'https://rashmisweets.in/wp-content/uploads/2024/07/Paneer-Samosa.png',
  catering: 'https://www.khfm.in/assets/img/services/catering-service.jpg',
  bulk: 'https://images.pexels.com/photos/7592526/pexels-photo-7592526.jpeg',
  kachori:
    'https://content3.jdmagicbox.com/v2/comp/thane/p9/022pxx22.xx22.230217070244.h2p9/catalogue/shegaon-kachori-centre-thane-food-court-2tshr6bicg.jpg',
};

export const imageSource = (image) => (typeof image === 'string' ? { uri: image } : image);

export const formatMoney = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
