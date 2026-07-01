import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { downloadOrderInvoice } from '../../utils/invoice';
import { getOrderImage } from '../../utils/orderDisplay';
import { useRealtimeEvent } from '../../context/RealtimeContext';

const summarizeItems = (order) =>
  (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ');

const summarizeOrder = (order) =>
  `${order.order_type === 'Bulk' ? 'Bulk - ' : ''}${summarizeItems(order)}`;

const getOrderLabel = (payload = {}) =>
  payload.customer_name || (payload.orderId ? `order ${payload.orderId.slice(-6).toUpperCase()}` : 'this order');

const OrderVerificationScreen = () => {
  const orders = useApiResource('/orders?status=Pending,Ready,Out%20for%20Delivery', []);
  const deliveryBoys = useApiResource('/sales/delivery-boys', []);
  const pendingOrders = (orders.data || []).filter((order) => order.status === 'Pending');
  const readyOrders = (orders.data || []).filter(
    (order) => order.status === 'Ready' && order.delivery?.status !== 'Assigned'
  );
  const dispatchOrders = (orders.data || []).filter(
    (order) =>
      order.status === 'Out for Delivery' &&
      ['Picked Up', 'In Transit'].includes(order.delivery?.status)
  );
  const [selectedDeliveryByOrder, setSelectedDeliveryByOrder] = useState({});
  const [busyId, setBusyId] = useState('');
  const [invoiceBusyId, setInvoiceBusyId] = useState('');
  const [pageMessage, setPageMessage] = useState('');
  const [orderMessagesById, setOrderMessagesById] = useState({});

  const refresh = async () => {
    await Promise.all([orders.refetch(), deliveryBoys.refetch()]);
  };

  const setOrderMessage = (orderId, nextMessage) => {
    if (!orderId) {
      setPageMessage(nextMessage);
      return;
    }

    setOrderMessagesById((current) => ({
      ...current,
      [orderId]: nextMessage,
    }));
  };

  const handleDeliveryStatus = useCallback(
    (payload = {}) => {
      const deliveryBoyName = payload.delivery_boy_name || 'Delivery boy';
      const orderLabel = getOrderLabel(payload);

      if (payload.status === 'Picked Up') {
        setOrderMessage(payload.orderId, `${deliveryBoyName} accepted pickup for ${orderLabel}. Vendor can track this order now.`);
        refresh();
        return;
      }

      if (payload.status !== 'Rejected') {
        return;
      }

      const rejectionMessage = `${deliveryBoyName} rejected the assigned order for ${orderLabel}.`;

      setOrderMessage(payload.orderId, rejectionMessage);
      Alert.alert('Delivery boy rejected order', rejectionMessage);
      refresh();
    },
    [orders.refetch, deliveryBoys.refetch]
  );

  useRealtimeEvent('delivery:status', handleDeliveryStatus);

  const passToProduction = async (orderId) => {
    if (busyId) {
      return;
    }

    try {
      setBusyId(orderId);
      setPageMessage('');
      await axios.put(`${API_URL}/orders/${orderId}/verify`, {
        note: 'Sales verified payment and quantities.',
      });
      await refresh();
      setPageMessage('Order sent to production.');
    } catch (error) {
      setPageMessage(error.response?.data?.message || 'Unable to send order to production');
    } finally {
      setBusyId('');
    }
  };

  const assignDelivery = async (orderId) => {
    if (busyId) {
      return;
    }

    const deliveryBoyId = selectedDeliveryByOrder[orderId];
    const selectedDeliveryBoy = (deliveryBoys.data || []).find((boy) => boy._id === deliveryBoyId);

    if (!deliveryBoyId) {
      setOrderMessage(orderId, 'Select an active delivery boy first.');
      return;
    }

    try {
      setBusyId(orderId);
      setOrderMessage(orderId, '');
      await axios.put(`${API_URL}/orders/${orderId}/assign-delivery`, {
        delivery_boy_id: deliveryBoyId,
        notes: 'Assigned by sales after production completion.',
      });
      await refresh();
      setOrderMessage(
        orderId,
        `Delivery request sent${selectedDeliveryBoy?.name ? ` to ${selectedDeliveryBoy.name}` : ''}. Waiting for acceptance.`
      );
    } catch (error) {
      setOrderMessage(orderId, error.response?.data?.message || 'Unable to assign delivery boy');
    } finally {
      setBusyId('');
    }
  };

  const downloadInvoice = async (order) => {
    if (invoiceBusyId) {
      return;
    }

    try {
      setInvoiceBusyId(order._id);
      const result = await downloadOrderInvoice(order);
      setPageMessage(result);
    } catch (error) {
      setPageMessage(error.message || 'Unable to download invoice.');
    } finally {
      setInvoiceBusyId('');
    }
  };

  const renderInvoiceButton = (order) => (
    <Pressable
      disabled={Boolean(busyId) || invoiceBusyId === order._id}
      style={[
        styles.invoiceButton,
        (Boolean(busyId) || invoiceBusyId === order._id) && styles.disabled,
      ]}
      onPress={() => downloadInvoice(order)}
    >
      <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.onBrand} />
      <Text style={styles.invoiceButtonText}>
        {invoiceBusyId === order._id ? 'Preparing...' : 'Download Invoice'}
      </Text>
    </Pressable>
  );

  const renderDeliveryAssignmentBox = (order) => {
    const isOrderBusy = busyId === order._id;
    const isAnyBusy = Boolean(busyId);
    const orderMessage = orderMessagesById[order._id];

    return (
      <View style={styles.assignmentBox}>
        <Text style={styles.assignmentLabel}>Available delivery boys</Text>
        <View style={styles.deliveryRow}>
          {(deliveryBoys.data || []).length ? (deliveryBoys.data || []).map((boy) => {
            const isSelected = selectedDeliveryByOrder[order._id] === boy._id;

            return (
              <Pressable
                key={boy._id}
                disabled={isAnyBusy}
                style={[
                  styles.deliveryChip,
                  isSelected && styles.deliveryChipActive,
                  isAnyBusy && styles.disabled,
                ]}
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
          }) : (
            <Text style={styles.deliveryEmpty}>No free delivery boy available right now.</Text>
          )}
        </View>
        {!!orderMessage && <Text style={styles.assignmentMessage}>{orderMessage}</Text>}
        <Pressable
          disabled={isAnyBusy}
          style={({ pressed }) => [
            styles.assignButton,
            pressed && styles.pressed,
            isAnyBusy && styles.disabled,
          ]}
          onPress={() => assignDelivery(order._id)}
        >
          {isOrderBusy ? (
            <ActivityIndicator color={colors.onBrand} size="small" />
          ) : (
            <MaterialCommunityIcons name="truck-delivery-outline" size={20} color={colors.onBrand} />
          )}
          <Text style={styles.assignButtonText}>{isOrderBusy ? 'Assigning...' : 'Assign Delivery Boy'}</Text>
        </Pressable>
      </View>
    );
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

      <SectionTitle title="New Order Requests" action="Pass to production" />
      <DataState isLoading={orders.isLoading} error={orders.error} empty={!pendingOrders.length}>
        {pendingOrders.map((order) => (
          <View key={order._id} style={styles.orderBlock}>
            <InfoCard
              title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
              subtitle={`${summarizeOrder(order)} - ${order.payment_method} / ${order.payment_status}`}
              right={formatMoney(order.final_amount)}
              status={order.status}
              image={getOrderImage(order)}
            />
            {!!order.bulk_note && <Text style={styles.vendorMessage}>vendor message :- {order.bulk_note}</Text>}
            {renderInvoiceButton(order)}
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
      {!!pageMessage && <Text style={styles.message}>{pageMessage}</Text>}

      <SectionTitle title="Ready From Production" action="Assign delivery" />
      <DataState
        isLoading={orders.isLoading || deliveryBoys.isLoading}
        error={orders.error || deliveryBoys.error}
        empty={!readyOrders.length}
      >
        {readyOrders.map((order) => (
          <View key={order._id} style={[styles.orderBlock, styles.dispatchOrderBox]}>
            <InfoCard
              title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
              subtitle={`${summarizeOrder(order)} - ${order.delivery_address?.location || 'Vendor outlet'}`}
              right={formatMoney(order.final_amount)}
              status={order.status}
              image={getOrderImage(order)}
            />
            {!!order.bulk_note && <Text style={styles.vendorMessage}>vendor message :- {order.bulk_note}</Text>}
            {renderInvoiceButton(order)}
            {renderDeliveryAssignmentBox(order)}
          </View>
        ))}
      </DataState>

      <SectionTitle title="Delivery Status" action="Live dispatch" />
      <DataState isLoading={orders.isLoading} error={orders.error} empty={!dispatchOrders.length}>
        {dispatchOrders.map((order) => (
          <View key={order._id} style={styles.orderBlock}>
            <InfoCard
              title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
              subtitle={`${order.delivery_boy?.name || 'Delivery boy'} - ${order.delivery?.status === 'Picked Up' ? 'Accepted delivery' : order.delivery?.status || 'Waiting for response'}`}
              right={formatMoney(order.final_amount)}
              status={order.delivery?.status || order.status}
              image={getOrderImage(order)}
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
  dispatchOrderBox: {
    borderColor: '#33ffff',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  deliveryRow: {
    flexDirection: 'column',
    gap: 8,
  },
  assignmentBox: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
    padding: 12,
  },
  assignmentMessage: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  assignmentLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  invoiceButton: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 4,
    minHeight: 42,
  },
  vendorMessage: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  invoiceButtonText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: '900',
  },
  deliveryChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
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
    color: colors.onBrand,
  },
  deliveryEmpty: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 8,
  },
  assignButton: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderColor: colors.red,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  assignButtonText: {
    color: colors.onBrand,
    fontSize: 15,
    fontWeight: '900',
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
  pressed: {
    opacity: 0.84,
  },
});

export default OrderVerificationScreen;
