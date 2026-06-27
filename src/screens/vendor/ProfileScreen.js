import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { AppScreen, DataState, InfoCard, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { API_URL, useAuth } from '../../context/AuthContext';
import { useApiResource } from '../../hooks/useApiResource';
import { colors, formatMoney, imageSource, images, shadows } from '../../theme/brand';
import { downloadOrderInvoice } from '../../utils/invoice';
import { formatOrderDate, getOrderImage, getOrderShortId, summarizeOrderItems } from '../../utils/orderDisplay';

const HISTORY_PAGE_SIZE = 8;
const emptyVendorForm = {
  name: '',
  phone: '',
  store_name: '',
  gst_number: '',
  address: '',
  city: '',
  state: '',
  zip: '',
};

const trimForm = (form) =>
  Object.keys(form).reduce((acc, key) => {
    acc[key] = String(form[key] || '').trim();
    return acc;
  }, {});

const isPlaceholderValue = (value) => String(value || '').trim().toLowerCase() === 'not provided';

const isDefaultOutletName = (storeName, ownerName) => {
  const normalizedStoreName = String(storeName || '').trim().toLowerCase();
  const normalizedOwnerName = String(ownerName || '').trim().toLowerCase();

  return Boolean(normalizedOwnerName && normalizedStoreName === `${normalizedOwnerName}'s outlet`);
};

const displayProfileValue = (value) => (isPlaceholderValue(value) ? '' : value || '');

const displayStoreName = (storeName, ownerName) =>
  isDefaultOutletName(storeName, ownerName) ? '' : displayProfileValue(storeName);

const ProfileScreen = ({ completionOnly = false }) => {
  const { user, logout, updateUser } = useAuth();
  const vendorProfile = useApiResource('/vendors/profile', null, { enabled: user?.role === 'vendor' });
  const [vendorForm, setVendorForm] = useState(emptyVendorForm);
  const [profileMessage, setProfileMessage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
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
  const vendorFormDirtyRef = useRef(false);
  const canDownloadInvoices = ['vendor', 'sales', 'admin'].includes(user?.role);
  const isVendor = user?.role === 'vendor';
  const isProfileComplete = Boolean(vendorProfile.data?.profile_complete);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    const profile = vendorProfile.data;

    if (!profile) {
      return;
    }

    if (vendorFormDirtyRef.current) {
      return;
    }

    const location = profile.location || {};
    const ownerName = profile.user?.name || user?.name || profile.owner_name || '';

    setVendorForm({
      name: displayProfileValue(ownerName),
      phone: displayProfileValue(profile.user?.phone || user?.phone),
      store_name: displayStoreName(profile.store_name, ownerName),
      gst_number: displayProfileValue(profile.gst_number),
      address: displayProfileValue(location.address),
      city: displayProfileValue(location.city),
      state: displayProfileValue(location.state),
      zip: displayProfileValue(location.zip),
    });
  }, [vendorProfile.data, user?.name, user?.phone]);

  const loadOrderHistory = useCallback(async (pageToLoad = 1) => {
    if (!user?.token || completionOnly) {
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
  }, [completionOnly, user?.token]);

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

  const updateVendorField = (field, value) => {
    vendorFormDirtyRef.current = true;
    setVendorForm((current) => ({ ...current, [field]: value }));
  };

  const saveVendorProfile = async () => {
    if (isSavingProfile) {
      return;
    }

    const nextForm = trimForm(vendorForm);
    const missingFields = ['name', 'phone', 'store_name', 'address', 'city', 'state', 'zip'].filter(
      (field) => !nextForm[field]
    );

    if (missingFields.length) {
      setProfileMessage('Fill member name, phone, outlet name, address, city, state, and ZIP / PIN.');
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileMessage('');
      const { data } = await axios.put(`${API_URL}/vendors/profile`, {
        name: nextForm.name,
        phone: nextForm.phone,
        store_name: nextForm.store_name,
        owner_name: nextForm.name,
        gst_number: nextForm.gst_number,
        location: {
          address: nextForm.address,
          city: nextForm.city,
          state: nextForm.state,
          zip: nextForm.zip,
        },
      });

      vendorFormDirtyRef.current = false;
      vendorProfile.setData(data);
      await updateUser({
        name: data.user?.name || nextForm.name,
        phone: data.user?.phone || nextForm.phone,
        vendor_profile_complete: Boolean(data.profile_complete),
        vendor_missing_profile_fields: data.missing_profile_fields || [],
      });
      setProfileMessage('Outlet details saved.');
    } catch (error) {
      setProfileMessage(error.response?.data?.message || 'Unable to save outlet details.');
    } finally {
      if (isMountedRef.current) {
        setIsSavingProfile(false);
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

        {isVendor && (
          <View style={styles.profileSection}>
            <SectionTitle
              title={completionOnly ? 'Complete Vendor Details' : 'Vendor Details'}
              action={isProfileComplete ? 'Complete' : 'Required'}
            />
            <DataState
              isLoading={vendorProfile.isLoading && !vendorProfile.data}
              error={!vendorProfile.data ? vendorProfile.error : ''}
              empty={false}
            >
              <View style={styles.vendorForm}>
                <Text style={styles.formHint}>
                  {completionOnly
                    ? 'Add your outlet details to continue.'
                    : 'Update your outlet details anytime.'}
                </Text>
                <TextInput
                  value={vendorForm.name}
                  onChangeText={(value) => updateVendorField('name', value)}
                  placeholder="Member name"
                  style={styles.input}
                  placeholderTextColor="#8A8A8A"
                />
                <TextInput
                  value={user?.email || ''}
                  editable={false}
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, styles.readOnlyInput]}
                  placeholderTextColor="#8A8A8A"
                />
                <TextInput
                  value={vendorForm.phone}
                  onChangeText={(value) => updateVendorField('phone', value)}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#8A8A8A"
                />
                <TextInput
                  value={vendorForm.store_name}
                  onChangeText={(value) => updateVendorField('store_name', value)}
                  placeholder="Outlet / store name"
                  style={styles.input}
                  placeholderTextColor="#8A8A8A"
                />
                <TextInput
                  value={vendorForm.address}
                  onChangeText={(value) => updateVendorField('address', value)}
                  placeholder="Outlet address"
                  style={styles.input}
                  placeholderTextColor="#8A8A8A"
                />
                <TextInput
                  value={vendorForm.city}
                  onChangeText={(value) => updateVendorField('city', value)}
                  placeholder="City"
                  style={styles.input}
                  placeholderTextColor="#8A8A8A"
                />
                <TextInput
                  value={vendorForm.state}
                  onChangeText={(value) => updateVendorField('state', value)}
                  placeholder="State"
                  style={styles.input}
                  placeholderTextColor="#8A8A8A"
                />
                <TextInput
                  value={vendorForm.zip}
                  onChangeText={(value) => updateVendorField('zip', value)}
                  placeholder="ZIP / PIN code"
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholderTextColor="#8A8A8A"
                />
                <TextInput
                  value={vendorForm.gst_number}
                  onChangeText={(value) => updateVendorField('gst_number', value)}
                  placeholder="GST number (optional)"
                  autoCapitalize="characters"
                  style={styles.input}
                  placeholderTextColor="#8A8A8A"
                />
                {!!profileMessage && <Text style={styles.profileMessage}>{profileMessage}</Text>}
                <PrimaryButton
                  label={completionOnly ? 'Save and Continue' : 'Save Vendor Details'}
                  icon="content-save"
                  loading={isSavingProfile}
                  loadingLabel="Saving..."
                  onPress={saveVendorProfile}
                />
              </View>
            </DataState>
          </View>
        )}

        {!completionOnly && <View style={styles.details}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{user?.phone || 'Not available'}</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{user?.status || 'pending'}</Text>
        </View>}

        {!completionOnly && <View style={styles.historySection}>
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
        </View>}

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
  profileSection: {
    marginTop: 24,
  },
  vendorForm: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    ...shadows.soft,
  },
  formHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readOnlyInput: {
    opacity: 0.68,
  },
  profileMessage: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
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
