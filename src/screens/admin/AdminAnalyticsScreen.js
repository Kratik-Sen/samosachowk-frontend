import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen, BrandHero, DataState, MetricGrid, ProgressBar, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney, images, shadows } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const AdminAnalyticsScreen = () => {
  const overview = useApiResource('/admin/overview', { teamCounts: {}, orderStats: {} });
  const data = overview.data || {};
  const totalUsers = Object.values(data.teamCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  const channels = [
    { label: 'Vendors', value: Math.round(((data.teamCounts?.vendor || 0) / totalUsers) * 100), color: colors.red },
    { label: 'Sales', value: Math.round(((data.teamCounts?.sales || 0) / totalUsers) * 100), color: colors.amber },
    { label: 'Production', value: Math.round(((data.teamCounts?.production || 0) / totalUsers) * 100), color: colors.green },
    { label: 'Delivery', value: Math.round(((data.teamCounts?.delivery || 0) / totalUsers) * 100), color: colors.blue },
  ];

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Analytics"
        title="Growth at a glance"
        subtitle="Track sales, category mix, vendor activity, and operational health."
        image={images.paneerSamosa}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Revenue', value: formatMoney(data.orderStats?.revenue), icon: 'cash-multiple', tone: colors.green },
          { label: 'Paid', value: formatMoney(data.orderStats?.paidRevenue), icon: 'receipt-text', tone: colors.red },
          { label: 'Pending pay', value: formatMoney(data.orderStats?.pendingPayments), icon: 'store-check', tone: colors.blue },
          { label: 'Wallet total', value: formatMoney(data.walletBalance), icon: 'truck-check', tone: colors.amber },
        ]}
      />

      <SectionTitle title="Channel Mix" />
      <DataState isLoading={overview.isLoading} error={overview.error} empty={false}>
        <View style={styles.panel}>
          {channels.map((channel) => (
            <View key={channel.label} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.label}>{channel.label}</Text>
                <Text style={styles.value}>{channel.value}%</Text>
              </View>
              <ProgressBar value={channel.value} color={channel.color} />
            </View>
          ))}
        </View>
      </DataState>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    ...shadows.card,
  },
  row: {
    marginBottom: 16,
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  value: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
});

export default AdminAnalyticsScreen;
