const EARTH_RADIUS_KM = 6371;
const ROAD_DISTANCE_FACTOR = 1.25;
const AVERAGE_CITY_SPEED_KMH = 24;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const toCoordinate = (location) => {
  const latitude = Number(location?.lat ?? location?.latitude);
  const longitude = Number(location?.lng ?? location?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const getDistanceKm = (from, to) => {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  }

  return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;
};

const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
};

export const estimateRouteInfo = (fromLocation, toLocation) => {
  const from = toCoordinate(fromLocation);
  const to = toCoordinate(toLocation);

  if (!from || !to) {
    return null;
  }

  const roadDistanceKm = getDistanceKm(from, to) * ROAD_DISTANCE_FACTOR;
  const minutes = Math.max(2, Math.round((roadDistanceKm / AVERAGE_CITY_SPEED_KMH) * 60));

  return {
    distanceText: formatDistance(roadDistanceKm),
    durationText: formatDuration(minutes),
    isEstimate: true,
  };
};

export const getDistanceKmBetween = (fromLocation, toLocation) => {
  const from = toCoordinate(fromLocation);
  const to = toCoordinate(toLocation);

  if (!from || !to) {
    return null;
  }

  return getDistanceKm(from, to);
};
