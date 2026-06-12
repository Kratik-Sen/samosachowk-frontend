import { useEffect, useMemo, useState } from 'react';
import { fetchGoogleRoadRoute } from '../utils/googleRoutes';

const toCoordinate = (location) => {
  const latitude = Number(location?.latitude ?? location?.lat);
  const longitude = Number(location?.longitude ?? location?.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const getLocationKey = (location) => {
  const coordinate = toCoordinate(location);
  return coordinate ? `${coordinate.latitude},${coordinate.longitude}` : '';
};

export const useGoogleRoadRoute = (originLocation, destinationLocation, enabled = true) => {
  const [route, setRoute] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const originKey = useMemo(() => getLocationKey(originLocation), [originLocation]);
  const destinationKey = useMemo(() => getLocationKey(destinationLocation), [destinationLocation]);

  useEffect(() => {
    if (!enabled || !originKey || !destinationKey) {
      setRoute(null);
      setError('');
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;

    setIsLoading(true);
    setError('');

    fetchGoogleRoadRoute(originLocation, destinationLocation)
      .then((nextRoute) => {
        if (isMounted) {
          setRoute(nextRoute);
          setError('');
        }
      })
      .catch((routeError) => {
        if (isMounted) {
          setRoute(null);
          setError(routeError.message || 'Google road route is unavailable.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, originKey, destinationKey]);

  return {
    error,
    isLoading,
    route,
  };
};
