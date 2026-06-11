import React from 'react';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, PrimaryButton, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const WalletScreen = () => {
  const wallet = useApiResource('/wallet', { balance: 0, reward_points: 0, transactions: [] });
  const walletData = wallet.data || {};

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
          { label: 'Reward points', value: `${walletData.reward_points || 0}`, icon: 'star-circle', tone: colors.yellow },
          { label: 'Transactions', value: `${walletData.transactions?.length || 0}`, icon: 'credit-card-check', tone: colors.green },
        ]}
      />

      <PrimaryButton label="Redeem Rewards" icon="wallet-plus" tone={colors.green} />

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
