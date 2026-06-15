import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, FoodCard, InfoCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { API_URL, useAuth } from '../../context/AuthContext';
import { colors, formatMoney, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';
import { getCurrentVendorLocation } from '../../utils/vendorLocation';
import { useNotificationSound } from '../../hooks/useNotificationSound';

const loadRazorpayWebScript = () =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Razorpay web checkout is not available.'));
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
    document.body.appendChild(script);
  });

const GST_RATE_PERCENT = 5;
const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const PlaceOrderScreen = () => {
  const route = useRoute();
  const { user } = useAuth();
  const products = useApiResource('/products', []);
  const playOrderSound = useNotificationSound('order');
  const appliedReorderKeyRef = useRef('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [quantities, setQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [orderType, setOrderType] = useState('Regular');
  const [bulkNote, setBulkNote] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [vendorLocation, setVendorLocation] = useState(null);

  const categories = useMemo(() => {
    const values = (products.data || []).map((product) => product.category).filter(Boolean);
    return ['All', ...Array.from(new Set(values))];
  }, [products.data]);

  const filteredProducts = useMemo(() => {
    return (products.data || []).filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesSearch = !search.trim() || product.name?.toLowerCase().includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, products.data, search]);

  const selectedItems = useMemo(() => {
    return (products.data || [])
      .filter((product) => quantities[product._id] > 0)
      .map((product) => ({
        ...product,
        quantity: quantities[product._id],
        lineTotal: Number(product.price || 0) * quantities[product._id],
      }));
  }, [products.data, quantities]);

  const subtotal = roundMoney(selectedItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const gstAmount = roundMoney((subtotal * GST_RATE_PERCENT) / 100);
  const billTotal = roundMoney(subtotal + gstAmount);
  const totalUnits = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const isBulkOrder = orderType === 'Bulk' || totalUnits >= 50;

  useEffect(() => {
    const reorderItems = route.params?.reorderItems;
    const reorderKey = `${route.params?.reorderSourceOrderId || 'order'}:${route.params?.reorderAt || ''}`;

    if (
      !Array.isArray(reorderItems) ||
      !reorderItems.length ||
      !products.data?.length ||
      appliedReorderKeyRef.current === reorderKey
    ) {
      return;
    }

    const activeProductIds = new Set((products.data || []).map((product) => product._id));
    const nextQuantities = reorderItems.reduce((acc, item) => {
      if (item.productId && activeProductIds.has(item.productId)) {
        acc[item.productId] = (acc[item.productId] || 0) + Math.max(1, Number(item.quantity || 1));
      }

      return acc;
    }, {});

    appliedReorderKeyRef.current = reorderKey;
    setSearch('');
    setCategory('All');

    if (Object.keys(nextQuantities).length) {
      setQuantities(nextQuantities);
      setMessage(`Bill prepared from order ${route.params?.reorderSourceOrderId?.slice(-6).toUpperCase() || ''}.`);
      return;
    }

    setMessage('The products from that past order are not active in the menu now.');
  }, [products.data, route.params]);

  const changeQuantity = (productId, delta) => {
    setQuantities((current) => ({
      ...current,
      [productId]: Math.max(0, (current[productId] || 0) + delta),
    }));
  };

  const captureVendorLocation = async (showSuccess = false) => {
    if (isLocating) {
      return vendorLocation;
    }

    try {
      setIsLocating(true);
      setMessage('');
      const nextLocation = await getCurrentVendorLocation();
      setVendorLocation(nextLocation);

      if (showSuccess) {
        setMessage('Current vendor location added to this order.');
      }

      return nextLocation;
    } catch (error) {
      setMessage(error.message || 'Unable to use current location.');
      throw error;
    } finally {
      setIsLocating(false);
    }
  };

  const getDeliveryAddress = async () => {
    return vendorLocation || captureVendorLocation(false);
  };

  const openRazorpayCheckout = async () => {
    const { data: razorpayOrder } = await axios.post(`${API_URL}/orders/razorpay`, {
      amount: billTotal,
    });

    const checkoutOptions = {
      key: razorpayOrder.key,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency || 'INR',
      order_id: razorpayOrder.orderId,
      name: 'Samosa Chowk',
      description: `${isBulkOrder ? 'Bulk' : 'Vendor'} order for ${user?.name || 'outlet'}`,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: colors.red },
    };
    const response =
      Platform.OS === 'web'
        ? await new Promise(async (resolve, reject) => {
            try {
              await loadRazorpayWebScript();
              const checkout = new window.Razorpay({
                ...checkoutOptions,
                handler: resolve,
                modal: {
                  ondismiss: () => reject(new Error('Razorpay payment was cancelled.')),
                },
              });
              checkout.open();
            } catch (error) {
              reject(error);
            }
          })
        : await require('react-native-razorpay').default.open(checkoutOptions);

    return {
      payment_status: 'completed',
      payment_id: response.razorpay_payment_id,
      razorpay_order_id: response.razorpay_order_id || razorpayOrder.orderId,
      razorpay_signature: response.razorpay_signature,
    };
  };

  const confirmOrder = async () => {
    if (isSubmitting || isLocating) {
      return;
    }

    if (!selectedItems.length) {
      setMessage('Add at least one product.');
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage('');

      const deliveryAddress = await getDeliveryAddress();
      const paymentDetails =
        paymentMethod === 'RAZORPAY'
          ? await openRazorpayCheckout()
          : { payment_status: 'pending' };

      await axios.post(`${API_URL}/orders`, {
        customer_name: user?.name,
        customer_phone: user?.phone || 'Not provided',
        items: selectedItems.map((item) => ({
          product: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          selectedPack: item.packages?.[0],
        })),
        total_amount: subtotal,
        discount_amount: 0,
        gst_rate: GST_RATE_PERCENT,
        gst_amount: gstAmount,
        final_amount: billTotal,
        payment_method: paymentMethod,
        ...paymentDetails,
        delivery_mode: 'Delivery',
        delivery_address: deliveryAddress,
        order_type: isBulkOrder ? 'Bulk' : 'Regular',
        bulk_note: isBulkOrder ? bulkNote : '',
      });
      playOrderSound();
      setQuantities({});
      setBulkNote('');
      setVendorLocation(null);
      setMessage('Order confirmed and sent to sales team.');
      products.refetch();
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Unable to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Fresh menu"
        title="Build today order"
        subtitle="Choose hot samosas, chaat plates, kachori, and bulk snack packs for your outlet."
        image={images.samosaChaat}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Selected', value: `${selectedItems.length}`, icon: 'package-variant', tone: colors.red },
          { label: isBulkOrder ? 'Bulk order' : 'Bill total', value: formatMoney(billTotal), icon: 'cart-check', tone: colors.green },
          { label: 'Units', value: `${totalUnits}`, icon: 'counter', tone: colors.blue },
        ]}
      />

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search products"
        style={styles.input}
        placeholderTextColor="#8A8A8A"
      />
      <View style={styles.categoryRow}>
        {categories.map((item) => (
          <Pressable
            key={item}
            style={[styles.categoryChip, category === item && styles.categoryChipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Category-wise Products" action="Tap + to add" />
      <DataState isLoading={products.isLoading} error={products.error} empty={!filteredProducts.length}>
        {filteredProducts.map((item) => (
          <View key={item._id} style={styles.productWrap}>
            <FoodCard item={item} />
            <View style={styles.stepper}>
              <Pressable style={styles.stepperButton} onPress={() => changeQuantity(item._id, -1)}>
                <Text style={styles.stepperText}>-</Text>
              </Pressable>
              <Text style={styles.quantity}>{quantities[item._id] || 0}</Text>
              <Pressable style={styles.stepperButton} onPress={() => changeQuantity(item._id, 1)}>
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </DataState>

      <SectionTitle title="Order Summary" />
      <DataState isLoading={false} empty={!selectedItems.length}>
        {selectedItems.map((item) => (
          <InfoCard
            key={item._id}
            title={`${item.name} x ${item.quantity}`}
            subtitle={item.category}
            right={formatMoney(item.lineTotal)}
            icon="cart-outline"
          />
        ))}
      </DataState>

      <SectionTitle title="Bill" action={`${GST_RATE_PERCENT}% GST`} />
      <View style={styles.billCard}>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Product subtotal</Text>
          <Text style={styles.billValue}>{formatMoney(subtotal)}</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>GST ({GST_RATE_PERCENT}%)</Text>
          <Text style={styles.billValue}>{formatMoney(gstAmount)}</Text>
        </View>
        <View style={styles.billDivider} />
        <View style={[styles.billRow, styles.billTotalRow]}>
          <Text style={styles.billTotalLabel}>Vendor total price</Text>
          <Text style={styles.billTotalValue}>{formatMoney(billTotal)}</Text>
        </View>
      </View>

      <SectionTitle title="Order Type" action={isBulkOrder ? 'Bulk' : 'Regular'} />
      <View style={styles.paymentRow}>
        {['Regular', 'Bulk'].map((type) => (
          <Pressable
            key={type}
            style={[styles.paymentChip, orderType === type && styles.paymentChipActive]}
            onPress={() => setOrderType(type)}
          >
            <Text style={[styles.paymentText, orderType === type && styles.paymentTextActive]}>
              {type}
            </Text>
          </Pressable>
        ))}
      </View>
      {isBulkOrder && (
        <TextInput
          value={bulkNote}
          onChangeText={setBulkNote}
          placeholder="Bulk order note, timing, cartons, or packing instruction"
          style={[styles.input, styles.noteInput]}
          placeholderTextColor="#8A8A8A"
          multiline
        />
      )}

      <SectionTitle title="Vendor Location" action={vendorLocation ? 'Ready' : 'Required'} />
      <View style={styles.locationCard}>
        <Text style={styles.locationTitle}>
          {vendorLocation ? 'Current outlet location' : 'Set outlet location'}
        </Text>
        <Text style={styles.locationText}>
          {vendorLocation?.location || 'Use your current location so the delivery boy can route to this order.'}
        </Text>
        <PrimaryButton
          label="Use Current Location"
          icon="crosshairs-gps"
          tone={colors.ink}
          disabled={isLocating || isSubmitting}
          loading={isLocating}
          loadingLabel="Locating..."
          onPress={() => captureVendorLocation(true).catch(() => {})}
        />
      </View>

      <SectionTitle title="Payment Method" action={paymentMethod === 'COD' ? 'Collect on delivery' : 'Pay now'} />
      <View style={styles.paymentRow}>
        {[
          { label: 'COD', value: 'COD', icon: 'cash' },
          { label: 'Razorpay', value: 'RAZORPAY', icon: 'credit-card-check' },
        ].map((method) => (
          <Pressable
            key={method.value}
            style={[styles.paymentChip, paymentMethod === method.value && styles.paymentChipActive]}
            onPress={() => setPaymentMethod(method.value)}
          >
            <Text style={[styles.paymentText, paymentMethod === method.value && styles.paymentTextActive]}>
              {method.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {!!message && <Text style={styles.message}>{message}</Text>}
      <PrimaryButton
        label="Confirm Order"
        icon="cart-check"
        onPress={confirmOrder}
        disabled={isLocating || isSubmitting}
        loading={isSubmitting}
        loadingLabel="Confirming..."
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteInput: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  categoryChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  categoryText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  categoryTextActive: {
    color: colors.white,
  },
  productWrap: {
    position: 'relative',
  },
  stepper: {
    alignItems: 'center',
    bottom: 12,
    flexDirection: 'row',
    position: 'absolute',
    right: 12,
  },
  stepperButton: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  stepperText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  quantity: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    minWidth: 34,
    textAlign: 'center',
  },
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  locationCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  locationTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },
  locationText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 12,
  },
  billCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  billRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  billLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  billValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  billDivider: {
    backgroundColor: colors.border,
    height: 1,
    marginBottom: 10,
  },
  billTotalRow: {
    marginBottom: 0,
  },
  billTotalLabel: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  billTotalValue: {
    color: colors.green,
    fontSize: 18,
    fontWeight: '900',
  },
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  paymentChip: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  paymentChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  paymentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  paymentTextActive: {
    color: colors.white,
  },
});

export default PlaceOrderScreen;
