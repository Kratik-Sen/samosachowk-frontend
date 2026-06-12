import Constants from 'expo-constants';
import { formatDistance } from './routeMetrics';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

const getGoogleMapsApiKey = () =>
  extra.googleMapsApiKey ||
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
  Constants.manifest?.android?.config?.googleMaps?.apiKey ||
  '';

const toCoordinate = (location) => {
  const latitude = Number(location?.latitude ?? location?.lat);
  const longitude = Number(location?.longitude ?? location?.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const formatDurationSeconds = (seconds) => {
  const minutes = Math.max(1, Math.round(seconds / 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
};

const parseDurationSeconds = (duration = '') => {
  const match = String(duration).match(/^([\d.]+)s$/);
  return match ? Number(match[1]) : NaN;
};

const decodePolyline = (encoded = '') => {
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
};

export const fetchGoogleRoadRoute = async (originLocation, destinationLocation) => {
  const apiKey = getGoogleMapsApiKey();
  const origin = toCoordinate(originLocation);
  const destination = toCoordinate(destinationLocation);

  if (!apiKey) {
    throw new Error('Google Maps API key is missing.');
  }

  if (!origin || !destination) {
    throw new Error('Route coordinates are missing.');
  }

  const response = await fetch(ROUTES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: origin,
        },
      },
      destination: {
        location: {
          latLng: destination,
        },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message || 'Google road route is unavailable.');
  }

  const route = payload.routes?.[0];
  const encodedPolyline = route?.polyline?.encodedPolyline;
  const durationSeconds = parseDurationSeconds(route?.duration);
  const distanceMeters = Number(route?.distanceMeters);

  if (!route || !encodedPolyline || !Number.isFinite(durationSeconds) || !Number.isFinite(distanceMeters)) {
    throw new Error('Google road route response was incomplete.');
  }

  return {
    coordinates: decodePolyline(encodedPolyline),
    routeInfo: {
      distanceText: formatDistance(distanceMeters / 1000),
      durationText: formatDurationSeconds(durationSeconds),
      isEstimate: false,
    },
  };
};
