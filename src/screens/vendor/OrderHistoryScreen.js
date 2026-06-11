import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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

const toCoordinate = (location) => {
  const latitude = Number(location?.lat);
  const longitude = Number(location?.lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const OrderHistoryScreen = () => {
  const { user } = useAuth();
  const orders = useApiResource('/vendors/orders', []);
  const [liveLocations, setLiveLocations] = useState({});
  const [message, setMessage] = useState('');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const completed = (orders.data || []).filter((order) => order.status === 'Delivered').length;
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
  const routeInfo = estimateRouteInfo(liveLocation, vendorLocation);
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

  const updateVendorLocation = async () => {
    if (isUpdatingLocation) {
      return;
    }

    if (!trackedOrder?._id) {
      setMessage('No active delivery order to update.');
      return;
    }

    try {
      setIsUpdatingLocation(true);
      setMessage('');
      const nextLocation = await getCurrentVendorLocation();
      await axios.put(`${API_URL}/vendors/orders/${trackedOrder._id}/location`, nextLocation);
      orders.setData((current) =>
        (current || []).map((order) =>
          order._id === trackedOrder._id ? { ...order, delivery_address: nextLocation } : order
        )
      );
      setMessage('Current vendor location shared for this delivery.');
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Unable to update vendor location.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const renderRouteInfo = () => {
    if (!trackedOrder) {
      return null;
    }

    return (
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
            'Waiting for delivery boy location to calculate ETA.'
          )}
        </Text>
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
        </View>
      );
    }

    if (Platform.OS === 'web') {
      return (
        <GoogleRouteMap
          vendorLocation={vendorLocation}
          deliveryLocation={deliveryCoordinate}
          status={trackedOrder.status}
        />
      );
    }

    if (!canRenderNativeMap) {
      return (
        <View style={styles.trackingBox}>
          <Text style={styles.trackingTitle}>Native map setup required</Text>
          <Text style={styles.trackingText}>{nativeMapSetupMessage}</Text>
          {renderRouteInfo()}
        </View>
      );
    }

    const maps = require('react-native-maps');
    const MapView = maps.default;
    const Marker = maps.Marker;
    const Polyline = maps.Polyline;
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
            initialRegion={region}
            region={region}
            toolbarEnabled={false}
            moveOnMarkerPress={false}
            loadingEnabled
          >
            <Marker coordinate={vendorCoordinate} title="Vendor outlet" description={vendorLocation?.location} />
            {deliveryCoordinate && (
              <>
                <Marker coordinate={deliveryCoordinate} title={trackedOrder.delivery_boy?.name || 'Delivery boy'} />
                <Polyline coordinates={[deliveryCoordinate, vendorCoordinate]} strokeColor={colors.red} strokeWidth={4} />
              </>
            )}
          </MapView>
        </View>
        {renderRouteInfo()}
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
          { label: 'Total orders', value: `${orders.data?.length || 0}`, icon: 'calendar-check', tone: colors.red },
          { label: 'Completed', value: `${completed}`, icon: 'check-circle', tone: colors.green },
        ]}
      />

      <SectionTitle title="Latest Orders" />
      <DataState isLoading={orders.isLoading} error={orders.error} empty={!orders.data?.length}>
        {(orders.data || []).map((order) => (
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
            disabled={isUpdatingLocation}
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
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default OrderHistoryScreen;
