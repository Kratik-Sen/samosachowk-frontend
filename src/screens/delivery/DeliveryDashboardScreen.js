import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { API_URL, useAuth } from '../../context/AuthContext';
import { colors, formatMoney, images, shadows } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';
import { getDeliveryStopSubtitle, getVendorContactText } from '../../utils/deliveryContact';

const DeliveryDashboardScreen = () => {
  const navigation = useNavigation();
  const { setUser } = useAuth();
  const deliveries = useApiResource('/delivery/dashboard?scope=active', []);
  const availability = useApiResource('/delivery/availability', { availability_status: 'inactive' });
  const codValue = (deliveries.data || []).reduce((sum, delivery) => sum + Number(delivery.order?.final_amount || 0), 0);
  const collected = (deliveries.data || []).filter((delivery) => delivery.payment_collected).length;
  const [promptRun, setPromptRun] = useState(null);
  const [dismissedPromptIds, setDismissedPromptIds] = useState({});
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [isAvailabilitySaving, setIsAvailabilitySaving] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      deliveries.refetch();
    }, 10000);

    return () => clearInterval(timer);
  }, [deliveries.refetch]);

  useEffect(() => {
    const assignedRun = (deliveries.data || []).find(
      (delivery) => delivery.status === 'Assigned' && !dismissedPromptIds[delivery._id]
    );

    if (assignedRun && !promptRun) {
      setPromptRun(assignedRun);
    }
  }, [deliveries.data, dismissedPromptIds, promptRun]);

  const toggleAvailability = async () => {
    if (isAvailabilitySaving) {
      return;
    }

    const nextStatus = availability.data?.availability_status === 'active' ? 'inactive' : 'active';

    try {
      setIsAvailabilitySaving(true);
      setMessage('');
      const { data } = await axios.put(`${API_URL}/delivery/availability`, {
        availability_status: nextStatus,
      });
      availability.setData(data);
      setUser((current) => (current ? { ...current, availability_status: data.availability_status } : current));
      setMessage(nextStatus === 'active' ? 'You are active for sales assignment.' : 'You are inactive for new assignments.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update availability');
    } finally {
      setIsAvailabilitySaving(false);
    }
  };

  const acceptRun = async (run) => {
    if (!run || busyId) return;

    try {
      setBusyId(run._id);
      setMessage('');
      await axios.put(`${API_URL}/delivery/${run._id}/accept`);
      setDismissedPromptIds((current) => ({ ...current, [run._id]: true }));
      setPromptRun(null);
      await deliveries.refetch();
      navigation.navigate('Tracking');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to accept delivery');
    } finally {
      setBusyId('');
    }
  };

  const closePrompt = () => {
    if (promptRun?._id) {
      setDismissedPromptIds((current) => ({ ...current, [promptRun._id]: true }));
    }

    setPromptRun(null);
  };

  const isAvailable = availability.data?.availability_status === 'active';

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Delivery desk"
        title="Hot orders, clean routes"
        subtitle="Go active for assignments, accept runs, collect payments, and keep vendors updated."
        image={images.catering}
        compact
      />

      <View style={styles.availabilityPanel}>
        <View style={styles.availabilityTextBlock}>
          <Text style={styles.availabilityTitle}>{isAvailable ? 'Active for assignments' : 'Inactive for assignments'}</Text>
          <Text style={styles.availabilityText}>
            {isAvailable ? 'Sales can assign ready orders to you.' : 'Turn active when you are ready for new delivery runs.'}
          </Text>
        </View>
        <Pressable
          disabled={isAvailabilitySaving}
          style={[styles.toggle, isAvailable && styles.toggleActive, isAvailabilitySaving && styles.buttonDisabled]}
          onPress={toggleAvailability}
        >
          <View style={[styles.toggleKnob, isAvailable && styles.toggleKnobActive]} />
        </Pressable>
      </View>

      {!!message && <Text style={styles.message}>{message}</Text>}

      <MetricGrid
        metrics={[
          { label: 'Assigned', value: `${deliveries.data?.length || 0}`, icon: 'moped', tone: colors.red },
          { label: 'COD value', value: formatMoney(codValue), icon: 'cash-multiple', tone: colors.green },
          { label: 'Collected', value: `${collected}`, icon: 'map-marker-path', tone: colors.amber },
          { label: 'Open runs', value: `${(deliveries.data || []).filter((item) => item.status !== 'Delivered').length}`, icon: 'clock-check', tone: colors.blue },
        ]}
      />

      <SectionTitle title="Runs" />
      <DataState isLoading={deliveries.isLoading} error={deliveries.error} empty={!deliveries.data?.length}>
        {(deliveries.data || []).map((run) => (
          <InfoCard
            key={run._id}
            title={`${run._id?.slice(-6).toUpperCase()} - ${run.order?.customer_name || 'Delivery'}`}
            subtitle={getDeliveryStopSubtitle(run.order, run.notes || 'No address note')}
            right={formatMoney(run.order?.final_amount)}
            status={run.status}
            icon="truck-delivery-outline"
          />
        ))}
      </DataState>

      <Modal transparent visible={!!promptRun} animationType="fade" onRequestClose={closePrompt}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New delivery assigned</Text>
            <Text style={styles.modalText}>
              {promptRun?.order?.customer_name || 'Vendor'} - {promptRun?.order?.delivery_address?.location || 'Outlet address'}
            </Text>
            <Text style={styles.modalContact}>{getVendorContactText(promptRun?.order)}</Text>
            <Text style={styles.modalAmount}>{formatMoney(promptRun?.order?.final_amount)}</Text>
            <PrimaryButton
              label="Receive Order"
              icon="package-check"
              onPress={() => acceptRun(promptRun)}
              loading={busyId === promptRun?._id}
              loadingLabel="Accepting..."
            />
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
  availabilityPanel: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 14,
    ...shadows.card,
  },
  availabilityTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  availabilityTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  availabilityText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  toggle: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: 62,
  },
  toggleActive: {
    backgroundColor: colors.green,
  },
  toggleKnob: {
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 26,
    width: 26,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  message: {
    color: colors.redDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
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
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 8,
  },
  modalContact: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
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

export default DeliveryDashboardScreen;
