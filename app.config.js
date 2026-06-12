const { expo } = require('./app.json');

const fallbackGoogleMapsApiKey = 'AIzaSyAYg7O0hEYukdm4G6b11Gg9m0hx-V3e7lw';

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  fallbackGoogleMapsApiKey;

const androidConfig = {
  ...(expo.android?.config || {}),
};

if (googleMapsApiKey) {
  androidConfig.googleMaps = {
    ...(androidConfig.googleMaps || {}),
    apiKey: googleMapsApiKey,
  };
}

const iosConfig = {
  ...(expo.ios?.config || {}),
};

if (googleMapsApiKey) {
  iosConfig.googleMapsApiKey = googleMapsApiKey;
}

module.exports = {
  expo: {
    ...expo,
    ios: {
      ...expo.ios,
      ...(Object.keys(iosConfig).length ? { config: iosConfig } : {}),
    },
    android: {
      ...expo.android,
      ...(Object.keys(androidConfig).length ? { config: androidConfig } : {}),
    },
    extra: {
      ...expo.extra,
      googleMapsApiKeyConfigured: Boolean(googleMapsApiKey),
    },
  },
};
