import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, InfoCard, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import GoogleRouteMap from '../../components/GoogleRouteMap';
import { API_URL, useAuth } from '../../context/AuthContext';
import { colors, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';
import { createTrackingSocket } from '../../utils/socket';
import { estimateRouteInfo } from '../../utils/routeMetrics';
import { canRenderNativeMap, nativeMapSetupMessage } from '../../utils/nativeMaps';

const toCoordinate = (location) => {
  const latitude = Number(location?.lat ?? location?.latitude);
  const longitude = Number(location?.lng ?? location?.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const ignoreMapIntent = () => {};

const DeliveryTrackingScreen = () => {
  const { user } = useAuth();
  const deliveries = useApiResource('/delivery/dashboard', []);
  const [localLocations, setLocalLocations] = useState({});
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const activeRun = useMemo(
    () => (deliveries.data || []).find((delivery) => delivery.status !== 'Delivered'),
    [deliveries.data]
  );

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
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await publishLocation(run, position.coords, shouldRefetch);
  };

  useEffect(() => {
    if (!user?.token) {
      return undefined;
    }

    const socket = createTrackingSocket(user.token);
    const activeRunId = activeRun?._id;
    const handleLocation = (payload) => {
      if (payload?.deliveryId === activeRunId) {
        applyLiveLocation(payload.deliveryId, payload.current_location);
      }
    };

    socket.on('connect', () => {
      if (activeRunId) {
        socket.emit('tracking:join', { deliveryId: activeRunId });
      }
    });
    socket.on('delivery:assigned', () => {
      deliveries.refetch();
    });
    socket.on('tracking:snapshot', handleLocation);
    socket.on('delivery:location', handleLocation);
    socket.on('delivery:status', applyDeliveryStatus);

    return () => {
      if (activeRunId) {
        socket.emit('tracking:leave', { deliveryId: activeRunId });
      }

      socket.disconnect();
    };
  }, [user?.token, activeRun?._id, deliveries.refetch]);

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
        accuracy: Location.Accuracy.Balanced,
      });

      if (isActive) {
        await publishLocation(activeRun, position.coords, false);
      }

      const nextSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
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
      await shareLocation(run, false);
      await deliveries.refetch();
      setMessage('Delivery accepted and live location shared.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to accept delivery');
    } finally {
      setBusyId('');
    }
  };

  const renderRouteMap = () => {
    const vendorLocation = activeRun?.order?.delivery_address || null;
    const vendorCoordinate = toCoordinate(vendorLocation);
    const deliveryCoordinate =
      toCoordinate(activeRun?.current_location) ||
      toCoordinate(localLocations[activeRun?._id]);
    const routeInfo = estimateRouteInfo(deliveryCoordinate, vendorLocation);
    const routeInfoPanel = activeRun ? (
      <View style={styles.routeInfo}>
        <Text style={styles.routeInfoTitle}>Time to vendor</Text>
        <Text style={styles.routeInfoText}>
          {routeInfo ? (
            <>
              {`${routeInfo.durationText} est. (`}
              <Text style={styles.routeDistanceText}>{routeInfo.distanceText}</Text>
              {')'}
            </>
          ) : (
            'Waiting for your live location and vendor destination.'
          )}
        </Text>
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
        </View>
      );
    }

    if (Platform.OS === 'web') {
      return (
        <GoogleRouteMap
          vendorLocation={vendorLocation}
          deliveryLocation={deliveryCoordinate}
          status={activeRun.status}
        />
      );
    }

    if (!canRenderNativeMap) {
      return (
        <View style={styles.trackingBox}>
          <Text style={styles.trackingTitle}>Native map setup required</Text>
          <Text style={styles.trackingText}>{nativeMapSetupMessage}</Text>
          {routeInfoPanel}
        </View>
      );
    }

    const maps = require('react-native-maps');
    const MapView = maps.default;
    const Marker = maps.Marker;
    const Polyline = maps.Polyline;
    const ProviderGoogle = maps.PROVIDER_GOOGLE;
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
            />
            {deliveryCoordinate && (
              <>
                <Marker coordinate={deliveryCoordinate} title="My location" onPress={ignoreMapIntent} />
                <Polyline coordinates={[deliveryCoordinate, vendorCoordinate]} strokeColor={colors.red} strokeWidth={4} />
              </>
            )}
          </MapView>
        </View>
        {routeInfoPanel}
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
                    await shareLocation(run);
                    setMessage('Location shared with vendor.');
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
});

export default DeliveryTrackingScreen;
