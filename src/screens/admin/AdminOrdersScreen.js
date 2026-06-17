import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';
import { downloadOrderInvoice } from '../../utils/invoice';
import { getOrderImage } from '../../utils/orderDisplay';

const AdminOrdersScreen = () => {
  const orders = useApiResource('/orders', []);
  const pending = (orders.data || []).filter((order) => order.status !== 'Delivered').length;
  const delivered = (orders.data || []).filter((order) => order.status === 'Delivered').length;
  const [invoiceBusyId, setInvoiceBusyId] = useState('');
  const [message, setMessage] = useState('');

  const downloadInvoice = async (order) => {
    if (invoiceBusyId) {
      return;
    }

    try {
      setInvoiceBusyId(order._id);
      const result = await downloadOrderInvoice(order);
      setMessage(result);
    } catch (error) {
      setMessage(error.message || 'Unable to download invoice.');
    } finally {
      setInvoiceBusyId('');
    }
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Order monitor"
        title="All order stages"
        subtitle="From vendor cart to delivered snack carton, every order is visible."
        image={images.bulk}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Pending', value: `${pending}`, icon: 'timer-sand', tone: colors.amber },
          { label: 'Delivered', value: `${delivered}`, icon: 'check-circle', tone: colors.green },
        ]}
      />

      {!!message && <Text style={styles.message}>{message}</Text>}

      <SectionTitle title="Orders" action="Filter" />
      <DataState isLoading={orders.isLoading} error={orders.error} empty={!orders.data?.length}>
        {(orders.data || []).map((order) => (
          <View key={order._id} style={styles.orderBlock}>
            <InfoCard
              title={order._id?.slice(-6).toUpperCase()}
              subtitle={`${order.customer_name} - ${order.order_type || 'Regular'} - ${order.payment_status}`}
              right={formatMoney(order.final_amount)}
              status={order.status}
              image={getOrderImage(order)}
            />
            <Pressable
              disabled={invoiceBusyId === order._id}
              style={({ pressed }) => [styles.invoiceButton, pressed && styles.pressed, invoiceBusyId === order._id && styles.disabled]}
              onPress={() => downloadInvoice(order)}
            >
              <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.onBrand} />
              <Text style={styles.invoiceButtonText}>{invoiceBusyId === order._id ? 'Preparing...' : 'Download Invoice'}</Text>
            </Pressable>
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
  invoiceButton: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 42,
  },
  invoiceButtonText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: '900',
  },
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.55,
  },
});

export default AdminOrdersScreen;
