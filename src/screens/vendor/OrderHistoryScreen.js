import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import GoogleRouteMap from '../../components/GoogleRouteMap';
import { colors, formatMoney, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';
import { API_URL, useAuth } from '../../context/AuthContext';
import { createTrackingSocket } from '../../utils/socket';
import { getCurrentVendorLocation } from '../../utils/vendorLocation';
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

const OrderHistoryScreen = () => {
  const { user } = useAuth();
  const orders = useApiResource('/vendors/orders?scope=active', []);
  const [liveLocations, setLiveLocations] = useState({});
  const [message, setMessage] = useState('');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [isRefreshingMap, setIsRefreshingMap] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const activeOrders = orders.data || [];
  const trackedOrder = useMemo(
    () => (orders.data || []).find((order) => order.status === 'Out for Delivery' && order.delivery_boy),
    [orders.data]
  );
  const liveLocation =
    liveLocations[trackedOrder?._id] ||
    trackedOrder?.delivery?.current_location;
  const deliveryCoordinate = toCoordinate(liveLocation);
  const vendorLocation = trackedOrder?.delivery_address || null;
  const vendorCoordinate = toCoordinate(vendorLocation);
  const nativeRoadRoute = useGoogleRoadRoute(
    deliveryCoordinate,
    vendorCoordinate,
    Platform.OS !== 'web' && Boolean(deliveryCoordinate && vendorCoordinate),
    mapRefreshKey
  );
  const routeInfo = nativeRoadRoute.route?.routeInfo || estimateRouteInfo(liveLocation, vendorLocation);
  const canRenderMap = trackedOrder && (Platform.OS === 'web' ? vendorLocation : vendorCoordinate);

  useEffect(() => {
    if (!user?.token) {
      return undefined;
    }

    const socket = createTrackingSocket(user.token);
    const trackedDeliveryId = trackedOrder?.delivery?._id;
    const trackedOrderId = trackedOrder?._id;

    const applyTrackingPayload = (payload) => {
      if (!payload || payload.orderId !== trackedOrderId) {
        return;
      }

      if (payload.current_location) {
        setLiveLocations((current) => ({
          ...current,
          [payload.orderId]: payload.current_location,
        }));
      }

      orders.setData((current) =>
        (current || []).map((order) =>
          order._id === payload.orderId
            ? {
                ...order,
                ...(payload.vendor_location
                  ? { delivery_address: { ...(order.delivery_address || {}), ...payload.vendor_location } }
                  : {}),
                ...(payload.current_location
                  ? {
                      delivery: {
                        ...(order.delivery || {}),
                        current_location: payload.current_location,
                      },
                    }
                  : {}),
              }
            : order
        )
      );
    };

    const joinTrackingRoom = () => {
      if (trackedDeliveryId) {
        socket.emit('tracking:join', { deliveryId: trackedDeliveryId });
      }
    };

    socket.on('connect', joinTrackingRoom);
    socket.on('delivery:assigned', () => {
      orders.refetch();
    });
    socket.on('delivery:status', () => {
      orders.refetch();
    });
    socket.on('tracking:snapshot', applyTrackingPayload);
    socket.on('delivery:location', applyTrackingPayload);
    socket.on('vendor:location', applyTrackingPayload);

    if (socket.connected) {
      joinTrackingRoom();
    }

    return () => {
      if (trackedDeliveryId) {
        socket.emit('tracking:leave', { deliveryId: trackedDeliveryId });
      }

      socket.disconnect();
    };
  }, [user?.token, trackedOrder?._id, trackedOrder?.delivery?._id, orders.refetch]);

  const saveCurrentVendorLocation = async () => {
    if (!trackedOrder?._id) {
      throw new Error('No active delivery order to update.');
    }

    const nextLocation = await getCurrentVendorLocation();
    await axios.put(`${API_URL}/vendors/orders/${trackedOrder._id}/location`, nextLocation);
    orders.setData((current) =>
      (current || []).map((order) =>
        order._id === trackedOrder._id ? { ...order, delivery_address: nextLocation } : order
      )
    );
    return nextLocation;
  };

  const updateVendorLocation = async () => {
    if (isUpdatingLocation || isRefreshingMap) {
      return;
    }

    try {
      setIsUpdatingLocation(true);
      setMessage('');
      await saveCurrentVendorLocation();
      setMapRefreshKey((current) => current + 1);
      setMessage('Current vendor location shared for this delivery.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Unable to update vendor location.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const refreshTrackingMap = async () => {
    if (isRefreshingMap || isUpdatingLocation) {
      return;
    }

    try {
      setIsRefreshingMap(true);
      setMessage('');
      await saveCurrentVendorLocation();
      await orders.refetch();
      setMapRefreshKey((current) => current + 1);
      setMessage('Map refreshed with current vendor and delivery locations.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Unable to refresh map location.');
    } finally {
      setIsRefreshingMap(false);
    }
  };

  const renderRouteInfo = () => {
    if (!trackedOrder) {
      return null;
    }

    const isLoadingNativeRoute = nativeRoadRoute.isLoading && Platform.OS !== 'web' && !nativeRoadRoute.route;

    return (
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
            'Waiting for delivery boy location to calculate ETA.'
          )}
        </Text>
        {!!nativeRoadRoute.error && Platform.OS !== 'web' && (
          <Text style={styles.routeWarning}>Road route unavailable. Showing estimated time.</Text>
        )}
      </View>
    );
  };

  const renderTrackingMap = () => {
    if (!canRenderMap) {
      return (
        <View style={styles.trackingBox}>
          <Text style={styles.trackingTitle}>
            {trackedOrder ? 'Waiting for live delivery location' : 'No active delivery assigned'}
          </Text>
          <Text style={styles.trackingText}>
            {trackedOrder
              ? vendorLocation?.location || 'Use current location to set the vendor destination.'
              : 'Once sales assigns a delivery boy, live tracking will appear here.'}
          </Text>
          {renderRouteInfo()}
          {trackedOrder && (
            <PrimaryButton
              label="Refresh Map"
              icon="refresh"
              tone={colors.ink}
              disabled={isRefreshingMap || isUpdatingLocation}
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
          status={trackedOrder.status}
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
          {renderRouteInfo()}
          <PrimaryButton
            label="Refresh Map"
            icon="refresh"
            tone={colors.ink}
            disabled={isRefreshingMap || isUpdatingLocation}
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
                  title={trackedOrder.delivery_boy?.name || 'Delivery boy'}
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
        {renderRouteInfo()}
        <PrimaryButton
          label="Refresh Map"
          icon="refresh"
          tone={colors.ink}
          disabled={isRefreshingMap || isUpdatingLocation}
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
        eyebrow="Order book"
        title="Every batch, tracked"
        subtitle="Follow verification, production, dispatch, and payment status in one clean timeline."
        image={images.bulk}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Active orders', value: `${activeOrders.length}`, icon: 'calendar-check', tone: colors.red },
          { label: 'On the way', value: `${activeOrders.filter((order) => order.status === 'Out for Delivery').length}`, icon: 'truck-delivery-outline', tone: colors.green },
        ]}
      />

      <SectionTitle title="Active Orders" />
      <DataState isLoading={orders.isLoading} error={orders.error} empty={!activeOrders.length}>
        {activeOrders.map((order) => (
          <InfoCard
            key={order._id}
            title={order._id?.slice(-6).toUpperCase()}
            subtitle={`${order.order_type === 'Bulk' ? 'Bulk - ' : ''}${order.customer_name} - ${(order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ')}`}
            right={formatMoney(order.final_amount)}
            status={order.status}
            icon="receipt"
          />
        ))}
      </DataState>

      <SectionTitle title="Live Delivery" action={trackedOrder?.delivery_boy?.name || 'Tracking'} />
      {!!message && <Text style={styles.message}>{message}</Text>}
      {trackedOrder && (
        <View style={styles.locationCard}>
          <Text style={styles.locationText}>
            {vendorLocation?.location || 'Vendor destination is not set for this order.'}
          </Text>
          <PrimaryButton
            label="Use Current Location"
            icon="crosshairs-gps"
            tone={colors.ink}
            disabled={isUpdatingLocation || isRefreshingMap}
            loading={isUpdatingLocation}
            loadingLabel="Updating..."
            onPress={updateVendorLocation}
          />
        </View>
      )}
      {renderTrackingMap()}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  mapWrap: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 280,
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
  locationCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  locationText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 12,
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
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default OrderHistoryScreen;
