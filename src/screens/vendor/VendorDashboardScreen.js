import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney, imageSource, images, shadows } from '../../theme/brand';
import { useAuth } from '../../context/AuthContext';
import { useApiResource } from '../../hooks/useApiResource';
import { downloadOrderInvoice } from '../../utils/invoice';
import { formatOrderDate, getOrderImage, getOrderShortId, getReorderItems, summarizeOrderItems } from '../../utils/orderDisplay';

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
  const products = useApiResource('/products?status=Active', []);
  const orders = useApiResource('/vendors/orders?scope=active', []);
  const reorderHistory = useApiResource('/orders/history?limit=3', { orders: [] });
  const dashboardData = dashboard.data || {};
  const pastOrders = reorderHistory.data?.orders || [];
  const featuredProducts = useMemo(() => (products.data || []).slice(0, 10), [products.data]);
  const [locationPrompt, setLocationPrompt] = useState(null);
  const [dismissedPromptIds, setDismissedPromptIds] = useState({});
  const [invoiceBusyId, setInvoiceBusyId] = useState('');
  const [actionMessage, setActionMessage] = useState('');

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

  const openProductOrder = (product) => {
    setActionMessage('');
    navigation.navigate('Place Order', {
      focusProductId: product._id,
      focusProductAt: Date.now(),
    });
  };

  const reorderFromPastOrder = (order) => {
    const reorderItems = getReorderItems(order);

    if (!reorderItems.length) {
      setActionMessage('This order has no active product reference to reorder.');
      return;
    }

    setActionMessage('');
    navigation.navigate('Place Order', {
      reorderItems,
      reorderSourceOrderId: order._id,
      reorderAt: Date.now(),
    });
  };

  const downloadInvoice = async (order) => {
    if (invoiceBusyId) {
      return;
    }

    try {
      setInvoiceBusyId(order._id);
      const result = await downloadOrderInvoice(order);
      setActionMessage(result);
    } catch (error) {
      setActionMessage(error.message || 'Unable to download invoice.');
    } finally {
      setInvoiceBusyId('');
    }
  };

  const renderOrderCard = (order, canReorder = false) => (
    <View key={order._id} style={styles.orderBlock}>
      <InfoCard
        title={`${getOrderShortId(order)} - ${order.customer_name}`}
        subtitle={`${formatOrderDate(order.updatedAt || order.createdAt)} - ${summarizeOrderItems(order) || 'No item details'}`}
        right={formatMoney(order.final_amount)}
        status={order.status}
        image={getOrderImage(order)}
        onPress={canReorder ? () => reorderFromPastOrder(order) : undefined}
      />
      <View style={styles.orderActions}>
        {canReorder && (
          <Pressable
            style={({ pressed }) => [styles.orderActionButton, pressed && styles.pressed]}
            onPress={() => reorderFromPastOrder(order)}
          >
            <MaterialCommunityIcons name="cart-arrow-right" size={18} color={colors.ink} />
            <Text style={styles.orderActionText}>Reorder</Text>
          </Pressable>
        )}
        <Pressable
          disabled={invoiceBusyId === order._id}
          style={({ pressed }) => [
            styles.orderActionButton,
            styles.invoiceButton,
            !canReorder && styles.orderActionButtonWide,
            pressed && styles.pressed,
            invoiceBusyId === order._id && styles.disabled,
          ]}
          onPress={() => downloadInvoice(order)}
        >
          <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.onBrand} />
          <Text style={[styles.orderActionText, styles.invoiceButtonText]}>
            {invoiceBusyId === order._id ? 'Preparing...' : 'Invoice'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

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

      {!!actionMessage && <Text style={styles.message}>{actionMessage}</Text>}

      <SectionTitle title="Order Products" action="Swipe" />
      <DataState isLoading={products.isLoading} error={products.error} empty={!featuredProducts.length}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productRail}
        >
          {featuredProducts.map((product) => (
            <Pressable
              key={product._id}
              style={({ pressed }) => [styles.productSlideCard, pressed && styles.pressed]}
              onPress={() => openProductOrder(product)}
            >
              <Image
                source={imageSource(product.image || images.heroSamosa)}
                style={styles.productSlideImage}
                resizeMode="cover"
              />
              <Text style={styles.productSlideCategory}>{product.category || 'Menu'}</Text>
              <Text style={styles.productSlideName} numberOfLines={2}>{product.name}</Text>
              <View style={styles.productSlideBottom}>
                <Text style={styles.productSlidePrice}>{formatMoney(product.price)}</Text>
                <View style={styles.productSlideButton}>
                  <Text style={styles.productSlideButtonText}>Add +</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </DataState>

      <SectionTitle title="Reorder From Past" action="Last 3" />
      <DataState isLoading={reorderHistory.isLoading} error={reorderHistory.error} empty={!pastOrders.length}>
        {pastOrders.map((order) => renderOrderCard(order, true))}
      </DataState>

      <SectionTitle title="Recent Orders" />
      <DataState
        isLoading={dashboard.isLoading}
        error={dashboard.error}
        empty={!dashboardData.recentOrders?.length}
      >
        {(dashboardData.recentOrders || []).map((order) => renderOrderCard(order))}
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
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  productRail: {
    gap: 12,
    paddingBottom: 12,
    paddingRight: 12,
  },
  productSlideCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: 188,
    ...shadows.soft,
  },
  productSlideImage: {
    backgroundColor: colors.surface,
    height: 104,
    width: '100%',
  },
  productSlideCategory: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: '900',
    marginHorizontal: 10,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  productSlideName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
    marginHorizontal: 10,
    marginTop: 4,
    minHeight: 38,
  },
  productSlideBottom: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  productSlidePrice: {
    color: colors.green,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  productSlideButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.red,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  productSlideButtonText: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  orderBlock: {
    marginBottom: 14,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -2,
  },
  orderActionButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 10,
    ...shadows.soft,
  },
  orderActionButtonWide: {
    flexGrow: 0,
    width: '100%',
  },
  orderActionText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  invoiceButton: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  invoiceButtonText: {
    color: colors.onBrand,
  },
  disabled: {
    opacity: 0.55,
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
