import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, InfoCard, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import GoogleRouteMap from '../../components/GoogleRouteMap';
import { API_URL } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { colors, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';
import { estimateRouteInfo } from '../../utils/routeMetrics';
import { canRenderNativeMap, nativeMapSetupMessage } from '../../utils/nativeMaps';
import { useGoogleRoadRoute } from '../../hooks/useGoogleRoadRoute';

const toCoordinate = (location) => {
  const latitude = Number(location?.lat ?? location?.latitude);
  const longitude = Number(location?.lng ?? location?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return { latitude, longitude };
};

const ignoreMapIntent = () => {};

const NativeMarkerIcon = ({ source }) => (
  <View style={styles.markerBubble}>
    <Image source={source} style={styles.markerIcon} resizeMode="contain" />
  </View>
);

const DeliveryTrackingScreen = () => {
  const { socket } = useRealtime();
  const deliveries = useApiResource('/delivery/dashboard?scope=active', []);
  const [localLocations, setLocalLocations] = useState({});
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [isRefreshingMap, setIsRefreshingMap] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const activeRun = useMemo(
    () => (deliveries.data || []).find((delivery) => delivery.status !== 'Delivered'),
    [deliveries.data]
  );
  const vendorLocation = activeRun?.order?.delivery_address || null;
  const vendorCoordinate = toCoordinate(vendorLocation);
  const deliveryCoordinate =
    toCoordinate(activeRun?.current_location) ||
    toCoordinate(localLocations[activeRun?._id]);
  const nativeRoadRoute = useGoogleRoadRoute(
    deliveryCoordinate,
    vendorCoordinate,
    Platform.OS !== 'web' && Boolean(deliveryCoordinate && vendorCoordinate),
    mapRefreshKey
  );
  const routeInfo = nativeRoadRoute.route?.routeInfo || estimateRouteInfo(deliveryCoordinate, vendorLocation);

  const applyLiveLocation = (deliveryId, location) => {
    if (!deliveryId || !location) {
      return;
    }

    setLocalLocations((current) => ({ ...current, [deliveryId]: location }));
    deliveries.setData((current) =>
      (current || []).map((run) =>
        run._id === deliveryId ? { ...run, current_location: location } : run
      )
    );
  };

  const applyVendorLocation = (deliveryId, location) => {
    if (!deliveryId || !location) {
      return;
    }

    deliveries.setData((current) =>
      (current || []).map((run) =>
        run._id === deliveryId
          ? {
              ...run,
              order: {
                ...(run.order || {}),
                delivery_address: {
                  ...(run.order?.delivery_address || {}),
                  ...location,
                },
              },
            }
          : run
      )
    );
  };

  const applyDeliveryStatus = (payload) => {
    if (!payload?.deliveryId || !payload.status) {
      return;
    }

    deliveries.setData((current) =>
      (current || []).map((run) =>
        run._id === payload.deliveryId
          ? {
              ...run,
              status: payload.status,
              order: payload.orderStatus ? { ...run.order, status: payload.orderStatus } : run.order,
            }
          : run
      )
    );
  };

  const publishLocation = async (run, coords, shouldRefetch = false) => {
    const payload = {
      lat: coords.latitude ?? coords.lat,
      lng: coords.longitude ?? coords.lng,
      updated_at: new Date().toISOString(),
    };

    await axios.post(`${API_URL}/delivery/${run._id}/location`, payload);
    applyLiveLocation(run._id, payload);

    if (shouldRefetch) {
      await deliveries.refetch();
    }
  };

  const shareLocation = async (run, shouldRefetch = true) => {
    if (!run) return;

    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      setMessage('Location permission is required for live tracking.');
      return false;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    await publishLocation(run, position.coords, shouldRefetch);
    return true;
  };

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const activeRunId = activeRun?._id;
    const handleLocation = (payload) => {
      if (payload?.deliveryId === activeRunId) {
        if (payload.current_location) {
          applyLiveLocation(payload.deliveryId, payload.current_location);
        }

        if (payload.vendor_location) {
          applyVendorLocation(payload.deliveryId, payload.vendor_location);
        }
      }
    };
    const joinTrackingRoom = () => {
      if (activeRunId) {
        socket.emit('tracking:join', { deliveryId: activeRunId });
      }
    };
    const handleDeliveryAssigned = () => {
      deliveries.refetch();
    };

    socket.on('connect', joinTrackingRoom);
    socket.on('delivery:assigned', handleDeliveryAssigned);
    socket.on('tracking:snapshot', handleLocation);
    socket.on('delivery:location', handleLocation);
    socket.on('vendor:location', handleLocation);
    socket.on('delivery:status', applyDeliveryStatus);

    if (socket.connected) {
      joinTrackingRoom();
    }

    return () => {
      socket.off('connect', joinTrackingRoom);
      socket.off('delivery:assigned', handleDeliveryAssigned);
      socket.off('tracking:snapshot', handleLocation);
      socket.off('delivery:location', handleLocation);
      socket.off('vendor:location', handleLocation);
      socket.off('delivery:status', applyDeliveryStatus);

      if (activeRunId) {
        socket.emit('tracking:leave', { deliveryId: activeRunId });
      }
    };
  }, [socket, activeRun?._id, deliveries.refetch]);

  useEffect(() => {
    if (!activeRun || activeRun.status === 'Assigned') {
      return undefined;
    }

    let isActive = true;
    let subscription;

    const startLocationWatch = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setMessage('Location permission is required for live tracking.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (isActive) {
        await publishLocation(activeRun, position.coords, false);
      }

      const nextSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
          timeInterval: 7000,
        },
        (nextPosition) => {
          publishLocation(activeRun, nextPosition.coords, false).catch(() => {});
        },
        (error) => {
          setMessage(error || 'Unable to watch live location.');
        }
      );

      if (isActive) {
        subscription = nextSubscription;
      } else {
        nextSubscription.remove();
      }
    };

    startLocationWatch().catch(() => {
      setMessage('Unable to start live tracking.');
    });

    return () => {
      isActive = false;

      if (subscription) {
        subscription.remove();
      }
    };
  }, [activeRun?._id, activeRun?.status]);

  const acceptRun = async (run) => {
    if (!run || busyId) {
      return;
    }

    try {
      setBusyId(run._id);
      setMessage('');
      await axios.put(`${API_URL}/delivery/${run._id}/accept`);
      const didShareLocation = await shareLocation(run, false);
      await deliveries.refetch();
      setMessage(
        didShareLocation
          ? 'Delivery accepted and live location shared.'
          : 'Delivery accepted. Allow location permission to share live tracking.'
      );
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to accept delivery');
    } finally {
      setBusyId('');
    }
  };

  const refreshTrackingMap = async () => {
    if (!activeRun || isRefreshingMap) {
      return;
    }

    try {
      setIsRefreshingMap(true);
      setMessage('');
      const didShareLocation = await shareLocation(activeRun, false);

      if (!didShareLocation) {
        return;
      }

      await deliveries.refetch();
      setMapRefreshKey((current) => current + 1);
      setMessage('Map refreshed with your latest location.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Unable to refresh map location.');
    } finally {
      setIsRefreshingMap(false);
    }
  };

  const renderRouteMap = () => {
    const isLoadingNativeRoute = nativeRoadRoute.isLoading && Platform.OS !== 'web' && !nativeRoadRoute.route;
    const routeInfoPanel = activeRun ? (
      <View style={styles.routeInfo}>
        <Text style={styles.routeInfoTitle}>Time to vendor</Text>
        <Text style={styles.routeInfoText}>
          {isLoadingNativeRoute ? (
            'Loading road route...'
          ) : routeInfo ? (
            <>
              {`${routeInfo.durationText}${routeInfo.isEstimate ? ' est.' : ''} (`}
              <Text style={styles.routeDistanceText}>{routeInfo.distanceText}</Text>
              {')'}
            </>
          ) : (
            'Waiting for your live location and vendor destination.'
          )}
        </Text>
        {!!nativeRoadRoute.error && Platform.OS !== 'web' && (
          <Text style={styles.routeWarning}>Road route unavailable. Showing estimated time.</Text>
        )}
      </View>
    ) : null;

    if (!activeRun || (!vendorCoordinate && Platform.OS !== 'web')) {
      return (
        <View style={styles.trackingBox}>
          <Text style={styles.trackingTitle}>
            {activeRun ? 'Vendor address' : 'No active delivery'}
          </Text>
          <Text style={styles.trackingText}>
            {activeRun
              ? vendorLocation?.location || 'Vendor current location is not set yet.'
              : 'Assigned runs will appear here after sales dispatch.'}
          </Text>
          {routeInfoPanel}
          {activeRun && (
            <PrimaryButton
              label="Refresh Map"
              icon="refresh"
              tone={colors.ink}
              disabled={isRefreshingMap}
              loading={isRefreshingMap}
              loadingLabel="Refreshing..."
              onPress={refreshTrackingMap}
            />
          )}
        </View>
      );
    }

    if (Platform.OS === 'web') {
      return (
        <GoogleRouteMap
          vendorLocation={vendorLocation}
          deliveryLocation={deliveryCoordinate}
          status={activeRun.status}
          onRefresh={refreshTrackingMap}
          refreshing={isRefreshingMap}
          refreshKey={mapRefreshKey}
        />
      );
    }

    if (!canRenderNativeMap) {
      return (
        <View style={styles.trackingBox}>
          <Text style={styles.trackingTitle}>Native map setup required</Text>
          <Text style={styles.trackingText}>{nativeMapSetupMessage}</Text>
          {routeInfoPanel}
          <PrimaryButton
            label="Refresh Map"
            icon="refresh"
            tone={colors.ink}
            disabled={isRefreshingMap}
            loading={isRefreshingMap}
            loadingLabel="Refreshing..."
            onPress={refreshTrackingMap}
          />
        </View>
      );
    }

    const maps = require('react-native-maps');
    const MapView = maps.default;
    const Marker = maps.Marker;
    const Polyline = maps.Polyline;
    const ProviderGoogle = maps.PROVIDER_GOOGLE;
    const roadRouteCoordinates = nativeRoadRoute.route?.coordinates || [];
    const region = deliveryCoordinate
      ? {
          latitude: (deliveryCoordinate.latitude + vendorCoordinate.latitude) / 2,
          longitude: (deliveryCoordinate.longitude + vendorCoordinate.longitude) / 2,
          latitudeDelta: Math.max(Math.abs(deliveryCoordinate.latitude - vendorCoordinate.latitude) * 2.5, 0.02),
          longitudeDelta: Math.max(Math.abs(deliveryCoordinate.longitude - vendorCoordinate.longitude) * 2.5, 0.02),
        }
      : { ...vendorCoordinate, latitudeDelta: 0.03, longitudeDelta: 0.03 };

    return (
      <>
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? ProviderGoogle : undefined}
            initialRegion={region}
            region={region}
            mapType="standard"
            userInterfaceStyle="light"
            toolbarEnabled={false}
            showsMyLocationButton={false}
            showsPointsOfInterests={false}
            onMarkerPress={ignoreMapIntent}
            onPoiClick={ignoreMapIntent}
            moveOnMarkerPress={false}
            loadingEnabled
          >
            <Marker
              coordinate={vendorCoordinate}
              title="Vendor outlet"
              description={vendorLocation?.location}
              onPress={ignoreMapIntent}
              tracksViewChanges={false}
            >
              <NativeMarkerIcon source={images.shopIcon} />
            </Marker>
            {deliveryCoordinate && (
              <>
                <Marker
                  coordinate={deliveryCoordinate}
                  title="My location"
                  onPress={ignoreMapIntent}
                  tracksViewChanges={false}
                >
                  <NativeMarkerIcon source={images.deliveryIcon} />
                </Marker>
                {roadRouteCoordinates.length > 1 && (
                  <Polyline coordinates={roadRouteCoordinates} strokeColor={colors.red} strokeWidth={4} />
                )}
              </>
            )}
          </MapView>
        </View>
        {routeInfoPanel}
        <PrimaryButton
          label="Refresh Map"
          icon="refresh"
          tone={colors.ink}
          disabled={isRefreshingMap}
          loading={isRefreshingMap}
          loadingLabel="Refreshing..."
          onPress={refreshTrackingMap}
        />
      </>
    );
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Live tracking"
        title="Dispatch route"
        subtitle="Accept assigned runs, share your live location, and navigate toward the vendor outlet."
        image={images.bulk}
        compact
      />

      {!!message && <Text style={styles.message}>{message}</Text>}

      <SectionTitle title="Active Route" action={activeRun?.status || 'Tracking'} />
      {renderRouteMap()}

      <SectionTitle title="Route Stops" />
      <DataState isLoading={deliveries.isLoading} error={deliveries.error} empty={!deliveries.data?.length}>
        {(deliveries.data || []).map((run, index) => (
          <View key={run._id} style={styles.runBlock}>
            <InfoCard
              title={`${index + 1}. ${run.order?.customer_name || 'Delivery stop'}`}
              subtitle={run.order?.delivery_address?.location || run.notes || 'No route note'}
              status={run.status}
              icon="map-marker-check"
            />
            {run.status === 'Assigned' ? (
              <PrimaryButton
                label="Accept Run"
                icon="crosshairs-gps"
                onPress={() => acceptRun(run)}
                disabled={Boolean(busyId)}
                loading={busyId === run._id}
                loadingLabel="Accepting..."
              />
            ) : run.status !== 'Delivered' ? (
              <PrimaryButton
                label="Share Current Location"
                icon="map-marker-path"
                tone={colors.ink}
                disabled={Boolean(busyId)}
                loading={busyId === run._id}
                loadingLabel="Sharing..."
                onPress={async () => {
                  if (busyId) {
                    return;
                  }

                  try {
                    setBusyId(run._id);
                    setMessage('');
                    const didShareLocation = await shareLocation(run);
                    if (didShareLocation) {
                      setMessage('Location shared with vendor.');
                    }
                  } catch (error) {
                    setMessage(error.response?.data?.message || 'Unable to share location');
                  } finally {
                    setBusyId('');
                  }
                }}
              />
            ) : null}
          </View>
        ))}
      </DataState>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  mapWrap: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 300,
    marginBottom: 14,
    overflow: 'hidden',
  },
  map: {
    height: '100%',
    width: '100%',
  },
  markerBubble: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 2,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  markerIcon: {
    height: 30,
    width: 30,
  },
  runBlock: {
    marginBottom: 14,
  },
  trackingBox: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  trackingTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },
  trackingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  routeInfo: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 14,
    marginTop: 10,
    padding: 12,
  },
  routeInfoTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  routeInfoText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  routeDistanceText: {
    color: colors.red,
    fontWeight: '900',
  },
  routeWarning: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 6,
  },
});

export default DeliveryTrackingScreen;
