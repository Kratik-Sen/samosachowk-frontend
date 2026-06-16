import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { API_URL } from '../../context/AuthContext';
import { colors, formatMoney, images, shadows } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';
import { formatDistance, getDistanceKmBetween } from '../../utils/routeMetrics';
import { getDeliveryStopSubtitle } from '../../utils/deliveryContact';

const DELIVERY_CLOSE_DISTANCE_KM = 0.7;
const DELIVERY_CLOSE_DISTANCE_TEXT = '0.7 km';

const PaymentCollectionScreen = () => {
  const deliveries = useApiResource('/delivery/dashboard?scope=active', []);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [completedRun, setCompletedRun] = useState(null);
  const pendingCod = (deliveries.data || [])
    .filter((delivery) => delivery.order?.payment_method === 'COD' && !delivery.payment_collected)
    .reduce((sum, delivery) => sum + Number(delivery.order?.final_amount || 0), 0);
  const collectedCod = (deliveries.data || [])
    .filter((delivery) => delivery.order?.payment_method === 'COD' && delivery.payment_collected)
    .reduce((sum, delivery) => sum + Number(delivery.amount_collected || 0), 0);
  const firstOpenRun = useMemo(
    () => (deliveries.data || []).find((delivery) => delivery.status !== 'Delivered'),
    [deliveries.data]
  );
  const vendorLocation = firstOpenRun?.order?.delivery_address;
  const distanceKm = getDistanceKmBetween(currentLocation || firstOpenRun?.current_location, vendorLocation);
  const distanceText = distanceKm === null ? 'Waiting for GPS' : formatDistance(distanceKm);
  const canCloseFirst = !!firstOpenRun && distanceKm !== null && distanceKm <= DELIVERY_CLOSE_DISTANCE_KM;

  useEffect(() => {
    if (!firstOpenRun) {
      setCurrentLocation(null);
      setLocationMessage('');
      return undefined;
    }

    let isActive = true;
    let subscription;

    const setPosition = (position) => {
      if (!isActive) {
        return;
      }

      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setLocationMessage('');
    };

    const watchDistance = async () => {
      if (!Number.isFinite(Number(vendorLocation?.lat)) || !Number.isFinite(Number(vendorLocation?.lng))) {
        setLocationMessage('Vendor location is not available for this delivery.');
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setLocationMessage('Allow location permission to close delivery near the vendor.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setPosition(position);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
          timeInterval: 7000,
        },
        setPosition
      );
    };

    watchDistance().catch(() => {
      if (isActive) {
        setLocationMessage('Unable to check current distance to vendor.');
      }
    });

    return () => {
      isActive = false;

      if (subscription) {
        subscription.remove();
      }
    };
  }, [firstOpenRun?._id, vendorLocation?.lat, vendorLocation?.lng]);

  const getFreshCurrentLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Allow location permission to close delivery near the vendor.');
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const nextLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    setCurrentLocation(nextLocation);
    return nextLocation;
  };

  const closeFirst = async () => {
    const run = firstOpenRun;
    if (!run || isClosing) return;

    try {
      setIsClosing(true);
      setLocationMessage('');
      const latestLocation = await getFreshCurrentLocation();
      const latestDistanceKm = getDistanceKmBetween(latestLocation, run.order?.delivery_address);

      if (latestDistanceKm === null || latestDistanceKm > DELIVERY_CLOSE_DISTANCE_KM) {
        setLocationMessage(
          `Reach within ${DELIVERY_CLOSE_DISTANCE_TEXT} of the vendor before closing. Current distance: ${latestDistanceKm === null ? 'unknown' : formatDistance(latestDistanceKm)
          }.`
        );
        return;
      }

      await axios.post(`${API_URL}/delivery/${run._id}/location`, latestLocation);
      const isCod = run.order?.payment_method === 'COD';
      await axios.put(`${API_URL}/delivery/${run._id}/delivered`, {
        payment_collected: isCod,
        amount_collected: isCod ? run.order?.final_amount || 0 : 0,
        current_location: latestLocation,
      });
      setCompletedRun(run);
      await deliveries.refetch();
    } catch (error) {
      setLocationMessage(error.response?.data?.message || error.message || 'Unable to close delivery.');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Cash collection"
        title={formatMoney(pendingCod)}
        subtitle="Record COD collections and close delivery runs cleanly."
        image={images.samosaChaat}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Collected', value: formatMoney(collectedCod), icon: 'cash-check', tone: colors.green },
          { label: 'Pending COD', value: formatMoney(pendingCod), icon: 'cash-clock', tone: colors.amber },
        ]}
      />

      <SectionTitle title="Payment Stops" />
      <View style={styles.distanceCard}>
        <Text style={styles.distanceLabel}>Distance to vendor</Text>
        <Text style={[styles.distanceValue, canCloseFirst && styles.distanceValueReady]}>
          {distanceText}
        </Text>
        <Text style={styles.distanceHint}>
          {canCloseFirst
            ? 'Close delivery is enabled.'
            : `Close delivery unlocks at ${DELIVERY_CLOSE_DISTANCE_TEXT} or less.`}
        </Text>
        {!!locationMessage && <Text style={styles.message}>{locationMessage}</Text>}
      </View>
      <DataState isLoading={deliveries.isLoading} error={deliveries.error} empty={!deliveries.data?.length}>
        {(deliveries.data || []).map((run) => (
          <InfoCard
            key={run._id}
            title={run.order?.customer_name || 'Delivery'}
            subtitle={`${run.order?.payment_method === 'COD'
                ? (run.payment_collected ? 'Payment collected' : 'Collection pending')
                : 'Paid online'
              } - ${getDeliveryStopSubtitle(run.order, run.notes || 'No address note')}`}
            right={formatMoney(run.order?.final_amount)}
            status={run.status}
            icon="cash-register"
          />
        ))}
      </DataState>

      <PrimaryButton
        label="Close First Open Delivery"
        icon="cash-check"
        disabled={!canCloseFirst || isClosing}
        loading={isClosing}
        loadingLabel="Closing..."
        onPress={closeFirst}
      />

      <Modal transparent visible={!!completedRun} animationType="fade" onRequestClose={() => setCompletedRun(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Order complete</Text>
            <Text style={styles.modalText}>
              {completedRun?.order?.customer_name || 'Delivery'} has been closed successfully.
            </Text>
            <Text style={styles.modalAmount}>{formatMoney(completedRun?.order?.final_amount)}</Text>
            <PrimaryButton label="Done" icon="check-circle" onPress={() => setCompletedRun(null)} />
            <Pressable style={styles.modalCancel} onPress={() => setCompletedRun(null)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  distanceCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
    ...shadows.card,
  },
  distanceLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  distanceValue: {
    color: colors.red,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  distanceValueReady: {
    color: colors.green,
  },
  distanceHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 8,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: '#00000080',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    maxWidth: 420,
    padding: 18,
    width: '100%',
    ...shadows.card,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 8,
  },
  modalAmount: {
    color: colors.green,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },
  modalCancel: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
});

export default PaymentCollectionScreen;
