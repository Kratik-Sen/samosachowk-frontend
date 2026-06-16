import { Platform } from 'react-native';

export const lightPalette = {
  appBg: '#F5F7F2',
  cream: '#FFFDF5',
  creamAlt: '#FFF6DB',
  surface: '#FFF0C7',
  white: '#FFFFFF',
  ink: '#181A16',
  muted: '#665F54',
  softText: '#8C8171',
  border: '#E8DEC8',
  black: '#000000',
  onBrand: '#FFFFFF',
  red: '#E2382F',
  redDark: '#B91F1A',
  yellow: '#FFD338',
  amber: '#F6A800',
  green: '#15803D',
  greenSoft: '#E8F7D7',
  blue: '#246BFE',
  mint: '#B7F04A',
  orange: '#FF7A1A',
  rose: '#FFEEF0',
  shadow: '#1B12081F',
  patternOverlay: '#FFFDF5D9',
  screenBand: '#E8F7D7D9',
  contrastBorder: '#000000',
  activeSurface: '#FFF2CF',
  activeTint: '#D63C26',
};

export const darkPalette = {
  appBg: '#000000',
  cream: '#241D18',
  creamAlt: '#2D241D',
  surface: '#33271D',
  white: '#000000',
  ink: '#FFF8EC',
  muted: '#D9CCBA',
  softText: '#B9AA98',
  border: '#45382D',
  black: '#000000',
  onBrand: '#FFFFFF',
  red: '#F04438',
  redDark: '#FF6B5F',
  yellow: '#FFD338',
  amber: '#FFB020',
  green: '#4ADE80',
  greenSoft: '#1F351D',
  blue: '#60A5FA',
  mint: '#B7F04A',
  orange: '#FF7A1A',
  rose: '#351A1D',
  shadow: '#00000080',
  patternOverlay: '#000000B8',
  screenBand: '#132016C9',
  contrastBorder: '#FFFFFF',
  activeSurface: '#26180F',
  activeTint: '#FFC65A',
};

const themeValue = (name, fallback) => (Platform.OS === 'web' ? `var(--sc-${name}, ${fallback})` : fallback);

export const colors = Object.keys(darkPalette).reduce((acc, key) => {
  const cssName = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  acc[key] = themeValue(cssName, darkPalette[key]);
  return acc;
}, {});

const cardShadow = Platform.OS === 'web'
  ? {
      boxShadow: `0 12px 26px ${colors.shadow}`,
    }
  : {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.32,
      shadowRadius: 18,
      elevation: 4,
    };

const softShadow = Platform.OS === 'web'
  ? {
      boxShadow: `0 8px 18px ${colors.shadow}`,
    }
  : {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 2,
    };

export const shadows = {
  card: cardShadow,
  soft: softShadow,
};

export const images = {
  logo: require('../../assets/samosa-logo.png'),
  darkModeBackground: require('../../assets/darkmode.png'),
  lightModeBackground: require('../../assets/lightmode.png'),
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
