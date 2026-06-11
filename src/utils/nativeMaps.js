import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

export const canRenderNativeMap = Platform.OS !== 'android' || Boolean(extra.googleMapsApiKeyConfigured);

export const nativeMapSetupMessage =
  'Set GOOGLE_MAPS_API_KEY or EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in the Expo/EAS build environment and rebuild the APK to show the map inside the app.';
