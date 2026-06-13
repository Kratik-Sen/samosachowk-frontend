import * as Location from 'expo-location';

const formatCoordinate = (value) => Number(value).toFixed(5);

const joinAddressParts = (parts) => parts.filter(Boolean).join(', ');

const describeAddress = (address) => {
  if (!address) {
    return '';
  }

  const street = joinAddressParts([address.name, address.street]);
  const locality = joinAddressParts([address.district, address.city || address.subregion]);
  const region = joinAddressParts([address.region, address.postalCode]);

  return joinAddressParts([street, locality, region, address.country]);
};

export const getCurrentVendorLocation = async () => {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Location permission is required to use your current outlet location.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  let label = `Current location (${formatCoordinate(lat)}, ${formatCoordinate(lng)})`;

  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const resolvedAddress = describeAddress(address);

    if (resolvedAddress) {
      label = resolvedAddress;
    }
  } catch (error) {
    // Coordinates are enough for routing when reverse geocoding is unavailable.
  }

  return {
    location: label,
    lat,
    lng,
  };
};
