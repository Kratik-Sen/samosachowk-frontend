import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { colors, images } from '../theme/brand';
import { useApiResource } from '../hooks/useApiResource';
import { estimateRouteInfo } from '../utils/routeMetrics';

const toCoordinate = (location) => {
  const lat = Number(location?.lat ?? location?.latitude);
  const lng = Number(location?.lng ?? location?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return { lat, lng };
};

const toGoogleLocation = (location) => {
  const coordinate = toCoordinate(location);

  if (coordinate) {
    return coordinate;
  }

  return location?.location || location?.address || '';
};

const toLocationKey = (location) => {
  const coordinate = toCoordinate(location);

  if (coordinate) {
    return `${coordinate.lat},${coordinate.lng}`;
  }

  return location?.location || location?.address || '';
};

const describeLocation = (location) => {
  const coordinate = toCoordinate(location);

  if (coordinate) {
    return `${coordinate.lat.toFixed(5)}, ${coordinate.lng.toFixed(5)}`;
  }

  if (location?.location) {
    return location.location;
  }

  return 'Not available';
};

const getRouteErrorHelp = (message = '') => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('not allowed') ||
    normalized.includes('request_denied') ||
    normalized.includes('rejected') ||
    normalized.includes('referrer')
  ) {
    return 'Allow this panel URL in your Google API key HTTP referrers and include Routes API in API restrictions.';
  }

  if (normalized.includes('tiles did not load')) {
    return 'Check the browser console for Google Maps errors, then verify billing, referrer restrictions, and API restrictions.';
  }

  return 'Enable Maps JavaScript API and Routes API in the same Google Cloud project.';
};

const getRouteWarningMessage = (message = '') => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('permission_denied') ||
    normalized.includes('routes_compute_routes') ||
    normalized.includes('routes api') ||
    normalized.includes('disabled')
  ) {
    return 'Road route is unavailable because Routes API is not enabled. Showing an estimated route.';
  }

  if (normalized.includes('quota') || normalized.includes('billing')) {
    return 'Road route is unavailable because Google route billing or quota needs attention. Showing an estimated route.';
  }

  return 'Road route is unavailable. Showing an estimated route.';
};

const getCurrentOrigin = () => {
  if (typeof window === 'undefined') {
    return 'this browser panel';
  }

  return window.location.origin;
};

const GOOGLE_MAPS_DEMO_MAP_ID = 'DEMO_MAP_ID';

const getAssetUri = (asset) => {
  if (!asset) {
    return '';
  }

  if (typeof asset === 'string') {
    return asset;
  }

  if (asset.uri) {
    return asset.uri;
  }

  try {
    const resolvedAsset = Asset.fromModule(asset);
    return resolvedAsset.localUri || resolvedAsset.uri || '';
  } catch (error) {
    return '';
  }
};

const getLocalizedText = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.text || value.localizedText || '';
};

const formatDistanceMeters = (distanceMeters) => {
  if (!Number.isFinite(distanceMeters)) {
    return '';
  }

  if (distanceMeters < 1000) {
    return `${Math.max(1, Math.round(distanceMeters))} m`;
  }

  const distanceKm = distanceMeters / 1000;
  return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;
};

const formatDurationSeconds = (durationSeconds) => {
  if (!Number.isFinite(durationSeconds)) {
    return '';
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
};

const parseDurationSeconds = (duration) => {
  if (typeof duration === 'number') {
    return duration;
  }

  if (typeof duration === 'string') {
    const match = duration.match(/^([\d.]+)s$/);
    return match ? Number(match[1]) : NaN;
  }

  return NaN;
};

const getRouteInfo = (route, fallback) => {
  const routeLeg = route?.legs?.[0];
  const localizedValues = routeLeg?.localizedValues || {};
  const durationValue = routeLeg?.duration || routeLeg?.staticDuration;

  return {
    distanceText:
      getLocalizedText(localizedValues.distance) ||
      getLocalizedText(routeLeg?.distance) ||
      formatDistanceMeters(routeLeg?.distanceMeters) ||
      fallback?.distanceText ||
      '',
    durationText:
      getLocalizedText(localizedValues.duration) ||
      getLocalizedText(localizedValues.staticDuration) ||
      getLocalizedText(durationValue) ||
      formatDurationSeconds(parseDurationSeconds(durationValue)) ||
      fallback?.durationText ||
      '',
    isEstimate: !routeLeg,
  };
};

const getRouteLegLocation = (routeLeg, camelKey, snakeKey) => {
  const location = routeLeg?.[camelKey] || routeLeg?.[snakeKey];

  return location?.latLng || location?.location || location || null;
};

const loadGoogleMaps = (apiKey) => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps is available in browser panels only.'));
  }

  if (window.__samosaGoogleMapsAuthError) {
    return Promise.reject(new Error(window.__samosaGoogleMapsAuthError));
  }

  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google.maps);
  }

  if (window.__samosaGoogleMapsPromise) {
    return window.__samosaGoogleMapsPromise;
  }

  window.__samosaGoogleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__samosaGoogleMapsLoaded';
    const script = document.createElement('script');
    const failWithGoogleAuthError = () => {
      const message = `Google Maps rejected ${getCurrentOrigin()}`;
      window.__samosaGoogleMapsAuthError = message;
      window.__samosaGoogleMapsPromise = null;
      window.dispatchEvent(new CustomEvent('samosa:google-maps-auth-error', { detail: { message } }));
      reject(new Error(message));
    };

    window.gm_authFailure = failWithGoogleAuthError;
    window[callbackName] = () => {
      if (window.__samosaGoogleMapsAuthError) {
        reject(new Error(window.__samosaGoogleMapsAuthError));
        return;
      }

      if (window.google?.maps?.importLibrary) {
        resolve(window.google.maps);
        return;
      }

      window.__samosaGoogleMapsPromise = null;
      reject(new Error('Google Maps JavaScript API loaded without map libraries'));
    };

    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.__samosaGoogleMapsPromise = null;
      reject(new Error('Unable to load Google Maps JavaScript API'));
    };
    document.head.appendChild(script);
  });

  return window.__samosaGoogleMapsPromise;
};

const GoogleRouteMap = ({ vendorLocation, deliveryLocation, status, onRefresh, refreshing = false, refreshKey = 0 }) => {
  const mapRef = useRef(null);
  const hasLoadedMapRef = useRef(false);
  const [routeError, setRouteError] = useState('');
  const [routeWarning, setRouteWarning] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [isRefreshingMap, setIsRefreshingMap] = useState(false);
  const config = useApiResource('/config/public', {
    googleMapsApiKey: '',
    googleMapsMapId: GOOGLE_MAPS_DEMO_MAP_ID,
  }, {
    enabled: Platform.OS === 'web',
    live: false,
  });
  const googleMapsApiKey = config.data?.googleMapsApiKey;
  const googleMapsMapId = config.data?.googleMapsMapId || GOOGLE_MAPS_DEMO_MAP_ID;
  const originKey = useMemo(() => toLocationKey(deliveryLocation), [deliveryLocation]);
  const destinationKey = useMemo(() => toLocationKey(vendorLocation), [vendorLocation]);
  const origin = useMemo(() => toGoogleLocation(deliveryLocation), [originKey]);
  const destination = useMemo(() => toGoogleLocation(vendorLocation), [destinationKey]);
  const estimatedRouteInfo = useMemo(() => estimateRouteInfo(deliveryLocation, vendorLocation), [originKey, destinationKey]);
  const displayedRouteInfo = routeInfo || estimatedRouteInfo;
  const routeDurationText = displayedRouteInfo?.durationText
    ? `${displayedRouteInfo.durationText}${displayedRouteInfo.isEstimate ? ' est.' : ''}`
    : '';
  const routeDistanceText = displayedRouteInfo?.distanceText || '';
  const routeTimeText = routeDurationText
    ? `${routeDurationText}${routeDistanceText ? ` (${routeDistanceText})` : ''}`
    : '';
  // Map renders whenever we have the vendor location; route drawn when both locations are known
  const canShowMap = Platform.OS === 'web' && googleMapsApiKey && !!destination;
  const canRoute = canShowMap && !!origin;
  const canRefresh = typeof onRefresh === 'function';
  const refreshInProgress = refreshing || isRefreshingMap;

  const refreshMap = async () => {
    if (!canRefresh || refreshInProgress) {
      return;
    }

    try {
      setIsRefreshingMap(true);
      hasLoadedMapRef.current = false;
      setIsMapReady(false);
      await onRefresh();
    } finally {
      setLocalRefreshKey((current) => current + 1);
      setIsRefreshingMap(false);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const handleAuthError = (event) => {
      setRouteError(event.detail?.message || `Google Maps rejected ${getCurrentOrigin()}`);
      setRouteWarning('');
      setRouteInfo(null);
      hasLoadedMapRef.current = false;
      setIsMapReady(false);
    };

    window.addEventListener('samosa:google-maps-auth-error', handleAuthError);

    return () => {
      window.removeEventListener('samosa:google-maps-auth-error', handleAuthError);
    };
  }, []);

  useEffect(() => {
    if (!canShowMap || !mapRef.current) {
      return undefined;
    }

    let isMounted = true;
    let markers = [];
    let routePolylines = [];
    let tileTimeout = null;
    let tileListener = null;
    let cleanupMap = () => {
      clearTimeout(tileTimeout);
      if (tileListener?.remove) tileListener.remove();
      routePolylines.forEach((polyline) => {
        polyline.setMap(null);
      });
      markers.forEach((marker) => {
        marker.map = null;
      });
      routePolylines = [];
      markers = [];
    };

    const initMap = async () => {
      try {
        setRouteError('');
        setRouteWarning('');
        setRouteInfo(null);
        const isInitialMapLoad = !hasLoadedMapRef.current;
        if (isInitialMapLoad) {
          setIsMapReady(false);
        }
        const maps = await loadGoogleMaps(googleMapsApiKey);
        const [mapsLibrary, coreLibrary, markerLibrary, routesLibrary] = await Promise.all([
          maps.importLibrary('maps'),
          maps.importLibrary('core'),
          maps.importLibrary('marker'),
          maps.importLibrary('routes'),
        ]);
        const { Map, Polyline: MapsPolyline } = mapsLibrary;
        const { LatLngBounds } = coreLibrary;
        const { AdvancedMarkerElement } = markerLibrary;
        const { Route } = routesLibrary;
        const Polyline = MapsPolyline || maps.Polyline;
        const shopIconUri = getAssetUri(images.shopIcon);
        const deliveryIconUri = getAssetUri(images.deliveryIcon);

        if (!isMounted || !mapRef.current) {
          return;
        }

        const deliveryCoord = toCoordinate(deliveryLocation);
        const vendorCoord = toCoordinate(vendorLocation) || deliveryCoord || { lat: 20.5937, lng: 78.9629 };
        const center = deliveryCoord
          ? {
              lat: (vendorCoord.lat + deliveryCoord.lat) / 2,
              lng: (vendorCoord.lng + deliveryCoord.lng) / 2,
            }
          : vendorCoord;

        const map = new Map(mapRef.current, {
          center,
          zoom: deliveryCoord ? 13 : 15,
          fullscreenControl: false,
          mapId: googleMapsMapId,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const fitMapToPoints = (points) => {
          const validPoints = points.filter(Boolean);

          if (!validPoints.length) {
            return;
          }

          if (validPoints.length === 1) {
            map.setCenter(validPoints[0]);
            return;
          }

          const bounds = new LatLngBounds();
          validPoints.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds);
        };

        const drawEstimatedRoute = () => {
          if (!deliveryCoord || !vendorCoord || !Polyline) {
            fitMapToPoints([deliveryCoord, vendorCoord]);
            return;
          }

          const fallbackPolyline = new Polyline({
            map,
            path: [deliveryCoord, vendorCoord],
            strokeColor: colors.red,
            strokeOpacity: 0.55,
            strokeWeight: 4,
          });
          routePolylines.push(fallbackPolyline);
          fitMapToPoints([deliveryCoord, vendorCoord]);
        };

        const createMarker = ({ position, title, iconUri }) => {
          const markerContent = document.createElement('div');
          markerContent.style.alignItems = 'center';
          markerContent.style.background = colors.white;
          markerContent.style.border = `2px solid ${colors.border}`;
          markerContent.style.borderRadius = '999px';
          markerContent.style.boxShadow = '0 4px 10px rgba(0,0,0,0.22)';
          markerContent.style.display = 'flex';
          markerContent.style.height = '42px';
          markerContent.style.justifyContent = 'center';
          markerContent.style.overflow = 'hidden';
          markerContent.style.width = '42px';

          const markerImage = document.createElement('img');
          markerImage.alt = title;
          markerImage.src = iconUri;
          markerImage.style.display = 'block';
          markerImage.style.height = '30px';
          markerImage.style.objectFit = 'contain';
          markerImage.style.width = '30px';
          markerContent.appendChild(markerImage);

          const marker = new AdvancedMarkerElement({
            content: markerContent,
            map,
            position,
            title,
          });
          markers.push(marker);
          return marker;
        };

        tileTimeout = isInitialMapLoad ? setTimeout(() => {
          if (isMounted && !hasLoadedMapRef.current) {
            setRouteError(`Google map tiles did not load for ${getCurrentOrigin()}`);
          }
        }, 9000) : null;

        tileListener = maps.event.addListenerOnce(map, 'tilesloaded', () => {
          clearTimeout(tileTimeout);
          if (isMounted) {
            hasLoadedMapRef.current = true;
            setIsMapReady(true);
          }
        });

        // Always place a vendor marker
        const vendorMarker = createMarker({
          position: vendorCoord,
          title: 'Vendor outlet',
          iconUri: shopIconUri,
        });

        let deliveryMarker = deliveryCoord
          ? createMarker({
              position: deliveryCoord,
              title: 'Delivery boy',
              iconUri: deliveryIconUri,
            })
          : null;

        if (canRoute) {
          try {
            const { routes } = await Route.computeRoutes({
              origin,
              destination,
              travelMode: 'DRIVING',
              fields: ['path', 'legs'],
            });
            const route = routes?.[0];

            if (!route) {
              throw new Error('No route found between delivery boy and vendor.');
            }

            if (isMounted) {
              routePolylines = route.createPolylines();
              routePolylines.forEach((polyline) => {
                if (polyline.setOptions) {
                  polyline.setOptions({
                    strokeColor: colors.red,
                    strokeOpacity: 0.95,
                    strokeWeight: 5,
                  });
                }
                polyline.setMap(map);
              });

              if (route.path?.length) {
                fitMapToPoints(route.path);
              }

              const routeLeg = route.legs?.[0];
              const startLocation = getRouteLegLocation(routeLeg, 'startLocation', 'start_location');

              if (!deliveryMarker && startLocation) {
                deliveryMarker = createMarker({
                  position: startLocation,
                  title: 'Delivery boy',
                  iconUri: deliveryIconUri,
                });
              }
              setRouteWarning('');
              setRouteInfo(getRouteInfo(route, estimatedRouteInfo));
            }
          } catch (routeError) {
            // Road routing can fail because Routes API is disabled. Keep the map usable with an estimate.
            if (isMounted) {
              drawEstimatedRoute();
              setRouteInfo(estimatedRouteInfo);
              setRouteWarning(getRouteWarningMessage(routeError.message));
            }
          }
        } else {
          // Delivery location not yet known; just show vendor pin.
          if (deliveryCoord) {
            deliveryMarker = deliveryMarker || createMarker({
              position: deliveryCoord,
              title: 'Delivery boy',
              iconUri: deliveryIconUri,
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          setRouteError(error.message || 'Google route is unavailable.');
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      cleanupMap();
    };
  }, [canShowMap, canRoute, googleMapsApiKey, googleMapsMapId, originKey, destinationKey, refreshKey, localRefreshKey]);

  if (Platform.OS !== 'web') {
    return null;
  }

  if (!googleMapsApiKey) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Google Maps key missing</Text>
        <Text style={styles.noticeText}>Add GOOGLE_MAPS_API_KEY in server .env, then restart the server.</Text>
        {!!routeTimeText && <Text style={styles.noticeText}>Time to vendor: {routeTimeText}</Text>}
      </View>
    );
  }

  if (!destination) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Waiting for vendor location</Text>
        <Text style={styles.noticeText}>Vendor: {describeLocation(vendorLocation)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.mapArea}>
        {React.createElement('div', {
          ref: mapRef,
          style: {
            backgroundColor: '#EEF2F1',
            display: 'block',
            height: '100%',
            minHeight: 340,
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
          },
        })}
        {!isMapReady && (
          <View style={styles.mapOverlay}>
            {!routeError && <ActivityIndicator color={colors.red} />}
            <Text style={styles.mapOverlayTitle}>
              {routeError ? 'Google map blocked' : 'Loading Google map'}
            </Text>
            <Text style={styles.mapOverlayText}>
              {routeError || `Waiting for map tiles from ${getCurrentOrigin()}`}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        {canRefresh && (
          <Pressable
            disabled={refreshInProgress}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.refreshButtonPressed,
              refreshInProgress && styles.refreshButtonDisabled,
            ]}
            onPress={refreshMap}
          >
            {refreshInProgress ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={18} color={colors.white} />
            )}
            <Text style={styles.refreshButtonText}>
              {refreshInProgress ? 'Refreshing...' : 'Refresh Map'}
            </Text>
          </Pressable>
        )}
        <Text style={styles.footerText}>Vendor: {describeLocation(vendorLocation)}</Text>
        <Text style={styles.footerText}>
          Delivery boy: {describeLocation(deliveryLocation)}
          {!toCoordinate(deliveryLocation) ? ' (waiting for live location...)' : ''}
        </Text>
        <Text style={styles.footerText}>
          Time to vendor:{' '}
          {routeDurationText ? (
            <>
              {routeDurationText}
              {!!routeDistanceText && <Text style={styles.routeDistanceText}> ({routeDistanceText})</Text>}
            </>
          ) : (
            'Waiting for route'
          )}
        </Text>
        {!!status && <Text style={styles.status}>{status}</Text>}
        {!!routeWarning && !routeError && (
          <Text style={styles.warning}>{routeWarning}</Text>
        )}
        {!!routeError && (
          <Text style={styles.error}>
            {routeError}. {getRouteErrorHelp(routeError)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  mapArea: {
    backgroundColor: '#EEF2F1',
    height: 340,
    position: 'relative',
    width: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.86)',
    justifyContent: 'center',
    padding: 18,
    pointerEvents: 'none',
  },
  mapOverlayTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  mapOverlayText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    textAlign: 'center',
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: 12,
  },
  refreshButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  refreshButtonPressed: {
    opacity: 0.84,
  },
  refreshButtonDisabled: {
    opacity: 0.55,
  },
  refreshButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  footerText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  routeDistanceText: {
    color: colors.red,
    fontWeight: '900',
  },
  status: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  error: {
    color: colors.redDark,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 8,
  },
  warning: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 8,
  },
  notice: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  noticeTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },
  noticeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
});

export default GoogleRouteMap;
