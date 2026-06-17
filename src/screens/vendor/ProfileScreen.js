import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { AppScreen, DataState, InfoCard, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { API_URL, useAuth } from '../../context/AuthContext';
import { colors, formatMoney, imageSource, images, shadows } from '../../theme/brand';
import { downloadOrderInvoice } from '../../utils/invoice';
import { formatOrderDate, getOrderImage, getOrderShortId, summarizeOrderItems } from '../../utils/orderDisplay';

const HISTORY_PAGE_SIZE = 8;

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [invoiceMessage, setInvoiceMessage] = useState('');
  const [invoiceBusyId, setInvoiceBusyId] = useState('');
  const isMountedRef = useRef(true);
  const canDownloadInvoices = ['vendor', 'sales', 'admin'].includes(user?.role);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const loadOrderHistory = useCallback(async (pageToLoad = 1) => {
    if (!user?.token) {
      setIsHistoryLoading(false);
      return;
    }

    const isLoadMore = pageToLoad > 1;

    try {
      if (isLoadMore) {
        setIsHistoryLoadingMore(true);
      } else {
        setIsHistoryLoading(true);
      }

      setHistoryError('');
      const { data } = await axios.get(`${API_URL}/orders/history`, {
        params: {
          page: pageToLoad,
          limit: HISTORY_PAGE_SIZE,
        },
      });
      const nextOrders = data.orders || [];

      if (!isMountedRef.current) {
        return;
      }

      setHistory((current) => (isLoadMore ? [...current, ...nextOrders] : nextOrders));
      setHistoryPage(pageToLoad);
      setHasMoreHistory(Boolean(data.hasMore));
    } catch (error) {
      if (isMountedRef.current) {
        setHistoryError(error.response?.data?.message || 'Unable to load order history');
      }
    } finally {
      if (isMountedRef.current) {
        setIsHistoryLoading(false);
        setIsHistoryLoadingMore(false);
      }
    }
  }, [user?.token]);

  useEffect(() => {
    loadOrderHistory(1);
  }, [loadOrderHistory]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      if (isMountedRef.current) {
        setIsLoggingOut(false);
      }
    }
  };

  const downloadInvoice = async (order) => {
    if (!canDownloadInvoices || invoiceBusyId) {
      return;
    }

    try {
      setInvoiceBusyId(order._id);
      const result = await downloadOrderInvoice(order);
      setInvoiceMessage(result);
    } catch (error) {
      setInvoiceMessage(error.message || 'Unable to download invoice.');
    } finally {
      if (isMountedRef.current) {
        setInvoiceBusyId('');
      }
    }
  };

  return (
    <AppScreen>
      <View style={styles.content}>
        <Image source={imageSource(images.logo)} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>{user?.name || 'Profile'}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.badge}>{user?.role || 'vendor'}</Text>

        <View style={styles.details}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user?.phone || 'Not available'}</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{user?.status || 'pending'}</Text>
        </View>

        <View style={styles.historySection}>
          <SectionTitle title="Order History" action="Last 20 days" />
          {canDownloadInvoices && !!invoiceMessage && <Text style={styles.historyMessage}>{invoiceMessage}</Text>}
          <DataState
            isLoading={isHistoryLoading && !history.length}
            error={!history.length ? historyError : ''}
            empty={!history.length}
          >
            {history.map((order) => (
              <View key={order._id} style={styles.historyOrderBlock}>
                <InfoCard
                  title={`${getOrderShortId(order)} - ${order.customer_name}`}
                  subtitle={`${formatOrderDate(order.updatedAt)} - ${summarizeOrderItems(order) || 'No item details'}`}
                  right={formatMoney(order.final_amount)}
                  status={order.status}
                  image={getOrderImage(order)}
                />
                {canDownloadInvoices && (
                  <Pressable
                    disabled={invoiceBusyId === order._id}
                    style={({ pressed }) => [
                      styles.invoiceButton,
                      pressed && styles.pressed,
                      invoiceBusyId === order._id && styles.disabled,
                    ]}
                    onPress={() => downloadInvoice(order)}
                  >
                    <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.onBrand} />
                    <Text style={styles.invoiceButtonText}>
                      {invoiceBusyId === order._id ? 'Preparing...' : 'Invoice PDF'}
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
          </DataState>
          {!!historyError && history.length > 0 && <Text style={styles.historyError}>{historyError}</Text>}
          {hasMoreHistory && (
            <PrimaryButton
              label="Load More Orders"
              icon="chevron-down"
              tone={colors.black}
              loading={isHistoryLoadingMore}
              loadingLabel="Loading..."
              onPress={() => loadOrderHistory(historyPage + 1)}
            />
          )}
        </View>

        <Pressable
          disabled={isLoggingOut}
          style={({ pressed }) => [styles.button, pressed && styles.pressed, isLoggingOut && styles.disabled]}
          onPress={handleLogout}
        >
          {isLoggingOut && <ActivityIndicator color={colors.onBrand} />}
          <Text style={styles.buttonText}>{isLoggingOut ? 'Loading...' : 'Logout'}</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  content: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 48,
  },
  logo: {
    height: 110,
    width: 150,
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 6,
  },
  meta: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 8,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  details: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 24,
    padding: 16,
    ...shadows.soft,
  },
  historySection: {
    marginTop: 24,
  },
  historyError: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  historyMessage: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  historyOrderBlock: {
    marginBottom: 14,
  },
  invoiceButton: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderColor: colors.red,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 42,
    ...shadows.soft,
  },
  invoiceButtonText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: '900',
  },
  label: {
    color: colors.softText,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  value: {
    color: colors.ink,
    fontSize: 16,
    marginTop: 4,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 24,
    ...shadows.soft,
  },
  buttonText: {
    color: colors.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
});

export default ProfileScreen;
