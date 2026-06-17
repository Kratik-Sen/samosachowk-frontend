import React, { useState } from 'react';
import { Text } from 'react-native';
import axios from 'axios';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';
import { API_URL } from '../../context/AuthContext';

const REDEEM_MIN_POINTS = 3000;

const WalletScreen = () => {
  const wallet = useApiResource('/wallet', { balance: 0, reward_points: 0, transactions: [] });
  const walletData = wallet.data || {};
  const rewardPoints = Number(walletData.reward_points || 0);
  const pendingRedeemRequest = (walletData.reward_redemptions || []).find((request) => request.status === 'pending');
  const canRedeem = rewardPoints >= REDEEM_MIN_POINTS && !pendingRedeemRequest;
  const [message, setMessage] = useState('');

  const requestRedeem = async () => {
    if (!canRedeem) {
      return;
    }

    try {
      setMessage('');
      const { data } = await axios.post(`${API_URL}/wallet/redeem`, {
        points: REDEEM_MIN_POINTS,
        notes: 'Vendor requested reward redemption.',
      });
      wallet.setData(data);
      setMessage('Redeem request sent to admin.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to send redeem request.');
    }
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Vendor wallet"
        title={formatMoney(walletData.balance)}
        subtitle="Use prepaid balance for faster dispatch and collect reward points on repeat orders."
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Reward points', value: `${rewardPoints} / ${REDEEM_MIN_POINTS}`, icon: 'star-circle', tone: colors.yellow },
          { label: 'Transactions', value: `${walletData.transactions?.length || 0}`, icon: 'credit-card-check', tone: colors.green },
        ]}
      />

      {!!message && <Text style={{ color: colors.redDark, fontSize: 13, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>{message}</Text>}
      <PrimaryButton
        label={pendingRedeemRequest ? 'Redeem Request Pending' : 'Redeem Rewards'}
        icon="wallet-plus"
        tone={colors.green}
        disabled={!canRedeem}
        onPress={requestRedeem}
      />

      <SectionTitle title="Transactions" />
      <DataState isLoading={wallet.isLoading} error={wallet.error} empty={!walletData.transactions?.length}>
        {(walletData.transactions || []).map((transaction) => (
          <InfoCard
            key={`${transaction.title}-${transaction.createdAt}`}
            title={transaction.title}
            subtitle={transaction.notes || transaction.status}
            right={transaction.points ? `${transaction.points} pts` : formatMoney(transaction.amount)}
            icon={transaction.type === 'credit' || transaction.type === 'reward' ? 'arrow-down-circle' : 'arrow-up-circle'}
          />
        ))}
      </DataState>
    </AppScreen>
  );
};

export default WalletScreen;
