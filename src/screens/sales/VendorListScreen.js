import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, SectionTitle } from '../../components/SamosaUI';
import { colors, images, shadows } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const VendorListScreen = () => {
  const vendors = useApiResource('/sales/vendors', []);
  const [statusFilter, setStatusFilter] = useState('active');
  const active = (vendors.data || []).filter((vendor) => vendor.user?.status === 'active').length;
  const nonactive = (vendors.data || []).filter((vendor) => vendor.user?.status !== 'active').length;
  const filteredVendors = useMemo(
    () =>
      (vendors.data || []).filter((vendor) =>
        statusFilter === 'active' ? vendor.user?.status === 'active' : vendor.user?.status !== 'active'
      ),
    [statusFilter, vendors.data]
  );

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Vendor network"
        title="Outlet approvals"
        subtitle="Review onboarding status, outstanding dues, and active store performance."
        image={images.heroSamosa}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Active', value: `${active}`, icon: 'store-check', tone: colors.green },
          { label: 'Nonactive', value: `${nonactive}`, icon: 'store-clock', tone: colors.amber },
        ]}
      />

      <View style={styles.filterRow}>
        {[
          { label: 'Active', value: 'active', count: active },
          { label: 'Nonactive', value: 'nonactive', count: nonactive },
        ].map((item) => {
          const isActive = statusFilter === item.value;

          return (
            <Pressable
              key={item.value}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {item.label} {item.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title="Vendors" action={statusFilter === 'active' ? 'Active' : 'Nonactive'} />
      <DataState isLoading={vendors.isLoading} error={vendors.error} empty={!filteredVendors.length}>
        {filteredVendors.map((vendor) => (
          <InfoCard
            key={vendor._id}
            title={vendor.store_name}
            subtitle={`${vendor.location?.city || 'City not set'} - ${vendor.user?.name || vendor.owner_name}`}
            status={vendor.user?.status}
            icon="store-outline"
          />
        ))}
      </DataState>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
    ...shadows.soft,
  },
  filterButtonActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  filterText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  filterTextActive: {
    color: colors.onBrand,
  },
});

export default VendorListScreen;
