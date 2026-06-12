import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppScreen, BrandHero, DataState, FoodCard, InfoCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney } from '../../theme/brand';
import { useAuth } from '../../context/AuthContext';
import { useApiResource } from '../../hooks/useApiResource';

const VendorDashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const dashboard = useApiResource('/vendors/dashboard', {
    recentOrders: [],
    totalOrders: 0,
    totalSpent: 0,
    walletBalance: 0,
    pendingOrders: 0,
    rewardPoints: 0,
  });
  const products = useApiResource('/products', []);
  const orders = useApiResource('/vendors/orders?scope=active', []);
  const dashboardData = dashboard.data || {};
  const [locationPrompt, setLocationPrompt] = useState(null);
  const [dismissedPromptIds, setDismissedPromptIds] = useState({});

  const onTheWayOrder = useMemo(
    () =>
      (orders.data || []).find(
        (order) => order.status === 'Out for Delivery' && order.delivery_boy && !dismissedPromptIds[order._id]
      ),
    [orders.data, dismissedPromptIds]
  );

  useEffect(() => {
    if (onTheWayOrder && !locationPrompt) {
      setLocationPrompt(onTheWayOrder);
    }
  }, [onTheWayOrder, locationPrompt]);

  const closePrompt = () => {
    if (locationPrompt?._id) {
      setDismissedPromptIds((current) => ({ ...current, [locationPrompt._id]: true }));
    }

    setLocationPrompt(null);
  };

  const openTracking = () => {
    closePrompt();
    navigation.navigate('History');
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Vendor counter"
        title={`Welcome${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        subtitle="Track today orders, reorder best sellers, and keep your outlet stocked with hot snacks."
      />

      <MetricGrid
        metrics={[
          { label: 'Total orders', value: `${dashboardData.totalOrders || 0}`, icon: 'receipt-text', tone: colors.red },
          { label: 'Wallet balance', value: formatMoney(dashboardData.walletBalance), icon: 'wallet', tone: colors.green },
          { label: 'Pending', value: `${dashboardData.pendingOrders || 0}`, icon: 'timer-sand', tone: colors.amber },
          { label: 'Rewards', value: `${dashboardData.rewardPoints || 0}`, icon: 'star-circle', tone: colors.yellow },
        ]}
      />

      <SectionTitle title="Fast Reorder" action="Menu" />
      <DataState isLoading={products.isLoading} error={products.error} empty={!products.data?.length}>
        {(products.data || []).slice(0, 2).map((item) => (
          <FoodCard key={item._id} item={item} />
        ))}
      </DataState>

      <SectionTitle title="Recent Orders" />
      <DataState
        isLoading={dashboard.isLoading}
        error={dashboard.error}
        empty={!dashboardData.recentOrders?.length}
      >
        {(dashboardData.recentOrders || []).map((order) => (
          <InfoCard
            key={order._id}
            title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
            subtitle={(order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ')}
            right={formatMoney(order.final_amount)}
            status={order.status}
            icon="clipboard-list-outline"
          />
        ))}
      </DataState>

      <Modal transparent visible={!!locationPrompt} animationType="fade" onRequestClose={closePrompt}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Order on the way</Text>
            <Text style={styles.modalText}>
              {locationPrompt?.delivery_boy?.name || 'Delivery boy'} is bringing order {locationPrompt?._id?.slice(-6).toUpperCase()}.
            </Text>
            <PrimaryButton label="See Location" icon="map-marker-path" onPress={openTracking} />
            <Pressable style={styles.modalCancel} onPress={closePrompt}>
              <Text style={styles.modalCancelText}>Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
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
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
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

export default VendorDashboardScreen;
