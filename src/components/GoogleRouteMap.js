import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/brand';
import { useApiResource } from '../hooks/useApiResource';
import { estimateRouteInfo } from '../utils/routeMetrics';

const toCoordinate = (location) => {
  const lat = Number(location?.lat ?? location?.latitude);
  const lng = Number(location?.lng ?? location?.longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
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
    return 'Allow this panel URL in your Google API key HTTP referrers and include Directions API in API restrictions.';
  }

  if (normalized.includes('tiles did not load')) {
    return 'Check the browser console for Google Maps errors, then verify billing, referrer restrictions, and API restrictions.';
  }

  return 'Enable Maps JavaScript API and Directions API in the same Google Cloud project.';
};

const getCurrentOrigin = () => {
  if (typeof window === 'undefined') {
    return 'this browser panel';
  }

  return window.location.origin;
};

const GOOGLE_MAPS_DEMO_MAP_ID = 'DEMO_MAP_ID';

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

const GoogleRouteMap = ({ vendorLocation, deliveryLocation, status }) => {
  const mapRef = useRef(null);
  const rendererRef = useRef(null);
  const hasLoadedMapRef = useRef(false);
  const [routeError, setRouteError] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
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

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const handleAuthError = (event) => {
      setRouteError(event.detail?.message || `Google Maps rejected ${getCurrentOrigin()}`);
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
    let map = null;
    let cleanupMap = () => {};
    let markers = [];

    const initMap = async () => {
      try {
        setRouteError('');
        setRouteInfo(null);
        const isInitialMapLoad = !hasLoadedMapRef.current;
        if (isInitialMapLoad) {
          setIsMapReady(false);
        }
        const maps = await loadGoogleMaps(googleMapsApiKey);
        const [{ Map }, { AdvancedMarkerElement, PinElement }, { DirectionsRenderer, DirectionsService }] = await Promise.all([
          maps.importLibrary('maps'),
          maps.importLibrary('marker'),
          maps.importLibrary('routes'),
        ]);

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

        map = new Map(mapRef.current, {
          center,
          zoom: deliveryCoord ? 13 : 15,
          fullscreenControl: false,
          mapId: googleMapsMapId,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const createMarker = ({ position, title, glyph, background, borderColor }) => {
          const pin = new PinElement({
            background,
            borderColor,
            glyph,
            glyphColor: colors.white,
          });
          const marker = new AdvancedMarkerElement({
            map,
            position,
            title,
            content: pin.element,
          });
          markers.push(marker);
          return marker;
        };

        const tileTimeout = isInitialMapLoad ? setTimeout(() => {
          if (isMounted && !hasLoadedMapRef.current) {
            setRouteError(`Google map tiles did not load for ${getCurrentOrigin()}`);
          }
        }, 9000) : null;

        const tileListener = maps.event.addListenerOnce(map, 'tilesloaded', () => {
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
          glyph: 'V',
          background: colors.red,
          borderColor: colors.redDark,
        });

        let deliveryMarker = deliveryCoord
          ? createMarker({
              position: deliveryCoord,
              title: 'Delivery boy',
              glyph: 'D',
              background: colors.blue,
              borderColor: colors.ink,
            })
          : null;

        let directionsRenderer = null;

        if (canRoute) {
          const directionsService = new DirectionsService();
          directionsRenderer = new DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: colors.red,
              strokeOpacity: 0.95,
              strokeWeight: 5,
            },
          });
          rendererRef.current = directionsRenderer;

          try {
            const result = await directionsService.route({
              origin,
              destination,
              travelMode: maps.TravelMode.DRIVING,
            });
            if (isMounted) {
              directionsRenderer.setDirections(result);
              const routeLeg = result.routes?.[0]?.legs?.[0];
              if (routeLeg?.end_location) {
                vendorMarker.position = routeLeg.end_location;
              }
              if (!deliveryMarker && routeLeg?.start_location) {
                deliveryMarker = createMarker({
                  position: routeLeg.start_location,
                  title: 'Delivery boy',
                  glyph: 'D',
                  background: colors.blue,
                  borderColor: colors.ink,
                });
              }
              setRouteInfo({
                distanceText: routeLeg?.distance?.text || estimatedRouteInfo?.distanceText || '',
                durationText: routeLeg?.duration?.text || estimatedRouteInfo?.durationText || '',
                isEstimate: !routeLeg?.duration?.text,
              });
            }
          } catch (routeError) {
            // Route failed; map still shows with vendor pin.
            if (isMounted) {
              setRouteError(routeError.message || 'Google route is unavailable.');
            }
          }
        } else {
          // Delivery location not yet known; just show vendor pin.
          if (deliveryCoord) {
            deliveryMarker = deliveryMarker || createMarker({
              position: deliveryCoord,
              title: 'Delivery boy',
              glyph: 'D',
              background: colors.blue,
              borderColor: colors.ink,
            });
          }
        }

        cleanupMap = () => {
          clearTimeout(tileTimeout);
          if (tileListener?.remove) tileListener.remove();
          if (directionsRenderer) directionsRenderer.setMap(null);
          markers.forEach((marker) => {
            marker.map = null;
          });
          markers = [];
        };
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
  }, [canShowMap, canRoute, googleMapsApiKey, googleMapsMapId, originKey, destinationKey]);

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
          <View pointerEvents="none" style={styles.mapOverlay}>
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
