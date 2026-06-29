const { expo } = require('./app.json');

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  '';

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
      googleMapsApiKey,
      googleMapsApiKeyConfigured: Boolean(googleMapsApiKey),
    },
  },
};
