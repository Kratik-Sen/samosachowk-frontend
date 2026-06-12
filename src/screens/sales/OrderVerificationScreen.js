import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import {
  AppScreen,
  BrandHero,
  DataState,
  InfoCard,
  MetricGrid,
  PrimaryButton,
  SectionTitle,
} from '../../components/SamosaUI';
import { API_URL } from '../../context/AuthContext';
import { colors, formatMoney, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const summarizeItems = (order) =>
  (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ');

const summarizeOrder = (order) =>
  `${order.order_type === 'Bulk' ? 'Bulk - ' : ''}${summarizeItems(order)}${
    order.bulk_note ? ` - ${order.bulk_note}` : ''
  }`;

const OrderVerificationScreen = () => {
  const orders = useApiResource('/orders?status=Pending,Ready', []);
  const deliveryBoys = useApiResource('/sales/delivery-boys', []);
  const pendingOrders = (orders.data || []).filter((order) => order.status === 'Pending');
  const readyOrders = (orders.data || []).filter((order) => order.status === 'Ready');
  const [selectedDeliveryByOrder, setSelectedDeliveryByOrder] = useState({});
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    await Promise.all([orders.refetch(), deliveryBoys.refetch()]);
  };

  const passToProduction = async (orderId) => {
    if (busyId) {
      return;
    }

    try {
      setBusyId(orderId);
      setMessage('');
      await axios.put(`${API_URL}/orders/${orderId}/verify`, {
        note: 'Sales verified payment and quantities.',
      });
      await refresh();
      setMessage('Order sent to production.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to send order to production');
    } finally {
      setBusyId('');
    }
  };

  const assignDelivery = async (orderId) => {
    if (busyId) {
      return;
    }

    const deliveryBoyId = selectedDeliveryByOrder[orderId];

    if (!deliveryBoyId) {
      setMessage('Select an active delivery boy first.');
      return;
    }

    try {
      setBusyId(orderId);
      setMessage('');
      await axios.put(`${API_URL}/orders/${orderId}/assign-delivery`, {
        delivery_boy_id: deliveryBoyId,
        notes: 'Assigned by sales after production completion.',
      });
      await refresh();
      setMessage('Delivery boy assigned. Vendor can track this order now.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to assign delivery boy');
    } finally {
      setBusyId('');
    }
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Verification"
        title="Check, confirm, dispatch"
        subtitle="Move paid or COD vendor orders into production, then assign active delivery boys when production is ready."
        image={images.samosaChaat}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'New requests', value: `${pendingOrders.length}`, icon: 'clipboard-clock', tone: colors.amber },
          { label: 'Ready orders', value: `${readyOrders.length}`, icon: 'package-check', tone: colors.green },
          { label: 'Delivery boys', value: `${deliveryBoys.data?.length || 0}`, icon: 'moped', tone: colors.blue },
        ]}
      />

      {!!message && <Text style={styles.message}>{message}</Text>}

      <SectionTitle title="New Order Requests" action="Pass to production" />
      <DataState isLoading={orders.isLoading} error={orders.error} empty={!pendingOrders.length}>
        {pendingOrders.map((order) => (
          <View key={order._id} style={styles.orderBlock}>
            <InfoCard
              title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
              subtitle={`${summarizeOrder(order)} - ${order.payment_method} / ${order.payment_status}`}
              right={formatMoney(order.final_amount)}
              status={order.status}
              icon="clipboard-check-outline"
            />
            <PrimaryButton
              label="Pass to Production"
              icon="factory"
              onPress={() => passToProduction(order._id)}
              disabled={Boolean(busyId)}
              loading={busyId === order._id}
              loadingLabel="Sending..."
            />
          </View>
        ))}
      </DataState>

      <SectionTitle title="Ready From Production" action="Assign delivery" />
      <DataState
        isLoading={orders.isLoading || deliveryBoys.isLoading}
        error={orders.error || deliveryBoys.error}
        empty={!readyOrders.length}
      >
        {readyOrders.map((order) => (
          <View key={order._id} style={styles.orderBlock}>
            <InfoCard
              title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
              subtitle={`${summarizeOrder(order)} - ${order.delivery_address?.location || 'Vendor outlet'}`}
              right={formatMoney(order.final_amount)}
              status={order.status}
              icon="package-variant-closed-check"
            />
            <View style={styles.deliveryRow}>
              {(deliveryBoys.data || []).map((boy) => {
                const isSelected = selectedDeliveryByOrder[order._id] === boy._id;

                return (
                  <Pressable
                    key={boy._id}
                    disabled={Boolean(busyId)}
                    style={[styles.deliveryChip, isSelected && styles.deliveryChipActive, Boolean(busyId) && styles.disabled]}
                    onPress={() =>
                      setSelectedDeliveryByOrder((current) => ({
                        ...current,
                        [order._id]: boy._id,
                      }))
                    }
                  >
                    <Text style={[styles.deliveryText, isSelected && styles.deliveryTextActive]}>
                      {boy.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton
              label="Assign Delivery Boy"
              icon="truck-delivery-outline"
              onPress={() => assignDelivery(order._id)}
              tone={colors.ink}
              disabled={Boolean(busyId)}
              loading={busyId === order._id}
              loadingLabel="Assigning..."
            />
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
  deliveryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    marginTop: -2,
  },
  deliveryChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deliveryChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  deliveryText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  deliveryTextActive: {
    color: colors.white,
  },
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
});

export default OrderVerificationScreen;
