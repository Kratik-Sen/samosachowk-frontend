import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, SectionTitle } from '../../components/SamosaUI';
import { API_URL } from '../../context/AuthContext';
import { colors, images, shadows } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const formatDateTime = (value) => {
  if (!value) {
    return 'Recent';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getVendorName = (request) => request.user?.name || request.user?.email || 'Vendor';

const AdminRewardsScreen = () => {
  const rewards = useApiResource('/admin/rewards', []);
  const [noteByRequest, setNoteByRequest] = useState({});
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState('');
  const rewardRequests = rewards.data || [];
  const pendingRequests = rewardRequests.filter((request) => request.status === 'pending');
  const reviewedRequests = rewardRequests.filter((request) => request.status !== 'pending');

  const updateRewardRequest = async (request, status) => {
    const actionKey = `${status}-${request._id}`;

    if (busyAction) {
      return;
    }

    try {
      setBusyAction(actionKey);
      setMessage('');
      await axios.put(`${API_URL}/admin/rewards/${request._id}`, {
        status,
        reward_note: noteByRequest[request._id] || '',
      });
      await rewards.refetch();
      setMessage(status === 'verified' ? 'Reward request verified.' : 'Reward request marked unverified.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update reward request.');
    } finally {
      setBusyAction('');
    }
  };

  const renderRequest = (request, canReview = false) => {
    const verifyBusy = busyAction === `verified-${request._id}`;
    const rejectBusy = busyAction === `rejected-${request._id}`;

    return (
      <View key={request._id} style={styles.requestBlock}>
        <InfoCard
          title={`${getVendorName(request)} - ${request.points} coins`}
          subtitle={`${request.user?.phone || request.user?.email || 'No contact'} - ${formatDateTime(request.requestedAt)}`}
          right={request.status}
          status={request.status}
          icon="gift-outline"
        />
        {canReview ? (
          <View style={styles.reviewPanel}>
            <TextInput
              value={noteByRequest[request._id] || ''}
              onChangeText={(value) =>
                setNoteByRequest((current) => ({
                  ...current,
                  [request._id]: value,
                }))
              }
              placeholder="Reward decision note"
              placeholderTextColor="#8A8A8A"
              style={styles.input}
            />
            <View style={styles.actionRow}>
              <Pressable
                disabled={Boolean(busyAction)}
                style={[styles.verifyButton, Boolean(busyAction) && styles.disabled]}
                onPress={() => updateRewardRequest(request, 'verified')}
              >
                {verifyBusy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.actionText}>Verify</Text>}
              </Pressable>
              <Pressable
                disabled={Boolean(busyAction)}
                style={[styles.rejectButton, Boolean(busyAction) && styles.disabled]}
                onPress={() => updateRewardRequest(request, 'rejected')}
              >
                {rejectBusy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.actionText}>Unverify</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.reviewNote}>
            {request.reward_note || (request.status === 'verified' ? 'Verified by admin.' : 'Unverified by admin.')}
          </Text>
        )}
      </View>
    );
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Rewards"
        title="Redeem requests"
        subtitle="Review vendor reward requests, verify eligible redemptions, or mark requests unverified."
        image={images.samosaChaat}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Pending', value: `${pendingRequests.length}`, icon: 'gift-open-outline', tone: colors.amber },
          { label: 'Reviewed', value: `${reviewedRequests.length}`, icon: 'check-decagram', tone: colors.green },
        ]}
      />

      {!!message && <Text style={styles.message}>{message}</Text>}

      <SectionTitle title="Pending Requests" action={pendingRequests.length ? 'Needs review' : undefined} />
      <DataState isLoading={rewards.isLoading} error={rewards.error} empty={!pendingRequests.length}>
        {pendingRequests.map((request) => renderRequest(request, true))}
      </DataState>

      <SectionTitle title="Reward History" />
      <DataState isLoading={rewards.isLoading} error="" empty={!reviewedRequests.length}>
        {reviewedRequests.map((request) => renderRequest(request))}
      </DataState>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  requestBlock: {
    marginBottom: 14,
  },
  reviewPanel: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    padding: 12,
    ...shadows.soft,
  },
  input: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyButton: {
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  rejectButton: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  actionText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: '900',
  },
  reviewNote: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
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

export default AdminRewardsScreen;
