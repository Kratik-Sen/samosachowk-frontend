import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen, BrandHero, DataState, MetricGrid, ProgressBar, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney, images, shadows } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const AdminAnalyticsScreen = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const overview = useApiResource('/admin/overview', { teamCounts: {}, orderStats: {} });
  const data = overview.data || {};
  const selectedPeriodData = data.revenuePeriods?.[selectedPeriod] || data.orderStats || {};
  const activeCounts = selectedPeriodData.activeCounts || {};
  const maxActiveCount = Math.max(
    Number(activeCounts.vendor || 0),
    Number(activeCounts.sales || 0),
    Number(activeCounts.production || 0),
    Number(activeCounts.delivery || 0),
    1
  );
  const channels = [
    { label: 'Vendors', count: activeCounts.vendor || 0, color: colors.red },
    { label: 'Sales', count: activeCounts.sales || 0, color: colors.amber },
    { label: 'Production', count: activeCounts.production || 0, color: colors.green },
    { label: 'Delivery', count: activeCounts.delivery || 0, color: colors.blue },
  ];
  const periodOptions = [
    { key: 'today', label: 'Today Total Revenue' },
    { key: 'monthly', label: 'Monthly Total Revenue' },
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

      <View style={styles.periodSelector}>
        {periodOptions.map((option) => {
          const isSelected = selectedPeriod === option.key;
          const periodRevenue = data.revenuePeriods?.[option.key]?.revenue || 0;

          return (
            <Pressable
              key={option.key}
              style={[styles.periodButton, isSelected && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(option.key)}
            >
              <Text style={[styles.periodButtonText, isSelected && styles.periodButtonTextActive]}>
                {option.label}
              </Text>
              <Text style={[styles.periodButtonValue, isSelected && styles.periodButtonValueActive]}>
                {formatMoney(periodRevenue)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <MetricGrid
        metrics={[
          { label: 'Revenue', value: formatMoney(selectedPeriodData.revenue), icon: 'cash-multiple', tone: colors.green },
          { label: 'Total orders', value: `${selectedPeriodData.totalOrders || 0}`, icon: 'receipt-text', tone: colors.red },
          { label: 'Paid', value: formatMoney(selectedPeriodData.paidRevenue), icon: 'check-circle', tone: colors.blue },
          { label: 'Pending pay', value: formatMoney(selectedPeriodData.pendingPayments), icon: 'store-check', tone: colors.amber },
          { label: 'Wallet total', value: formatMoney(data.walletBalance), icon: 'truck-check', tone: colors.amber },
        ]}
      />

      <SectionTitle title={selectedPeriod === 'today' ? 'Today Activity' : 'Monthly Activity'} />
      <DataState isLoading={overview.isLoading} error={overview.error} empty={false}>
        <View style={styles.panel}>
          {channels.map((channel) => (
            <View key={channel.label} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.label}>{channel.label}</Text>
                <Text style={styles.value}>{channel.count}</Text>
              </View>
              <ProgressBar value={Math.round((Number(channel.count || 0) / maxActiveCount) * 100)} color={channel.color} />
            </View>
          ))}
        </View>
      </DataState>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  periodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  periodButton: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 72,
    minWidth: 150,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...shadows.soft,
  },
  periodButtonActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  periodButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  periodButtonTextActive: {
    color: colors.onBrand,
  },
  periodButtonValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  periodButtonValueActive: {
    color: colors.yellow,
  },
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
