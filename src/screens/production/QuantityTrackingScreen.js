import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, InfoCard, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { API_URL } from '../../context/AuthContext';
import { colors, formatMoney, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const summarizeItems = (order) =>
  (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ');

const QuantityTrackingScreen = () => {
  const orders = useApiResource('/production/orders', []);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  const updateOrder = async (order, action) => {
    if (busyId) {
      return;
    }

    try {
      setBusyId(order._id);
      setMessage('');
      await axios.put(`${API_URL}/production/orders/${order._id}/${action}`, {
        note:
          action === 'ready'
            ? 'Production completed packing and sent the order back to sales.'
            : 'Production started preparing this order.',
      });
      await orders.refetch();
      setMessage(action === 'ready' ? 'Order marked ready for sales dispatch.' : 'Order marked in production.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update production order');
    } finally {
      setBusyId('');
    }
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Quantity tracking"
        title="Update every order"
        subtitle="Start verified orders, then mark them ready after preparation and packing are complete."
        image={images.paneerSamosa}
        compact
      />

      {!!message && <Text style={styles.message}>{message}</Text>}

      <SectionTitle title="Live Production" action="Sales verified" />
      <DataState isLoading={orders.isLoading} error={orders.error} empty={!orders.data?.length}>
        {(orders.data || []).map((order) => (
          <View key={order._id} style={styles.orderBlock}>
            <InfoCard
              title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
              subtitle={summarizeItems(order)}
              right={formatMoney(order.final_amount)}
              status={order.status}
              icon="clipboard-text-outline"
            />
            {order.status === 'Verified' ? (
              <PrimaryButton
                label="Start Production"
                icon="factory"
                onPress={() => updateOrder(order, 'start')}
                disabled={Boolean(busyId)}
                loading={busyId === order._id}
                loadingLabel="Starting..."
              />
            ) : (
              <PrimaryButton
                label="Mark Order Ready"
                icon="package-check"
                tone={colors.green}
                onPress={() => updateOrder(order, 'ready')}
                disabled={Boolean(busyId)}
                loading={busyId === order._id}
                loadingLabel="Updating..."
              />
            )}
          </View>
        ))}
      </DataState>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  orderBlock: {
    marginBottom: 14,
  },
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default QuantityTrackingScreen;
