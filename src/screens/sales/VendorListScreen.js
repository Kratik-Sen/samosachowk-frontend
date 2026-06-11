import React from 'react';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, SectionTitle } from '../../components/SamosaUI';
import { colors, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const VendorListScreen = () => {
  const vendors = useApiResource('/sales/vendors', []);
  const active = (vendors.data || []).filter((vendor) => vendor.user?.status === 'active').length;
  const pending = (vendors.data || []).filter((vendor) => vendor.user?.status === 'pending').length;

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
          { label: 'Pending', value: `${pending}`, icon: 'store-clock', tone: colors.amber },
        ]}
      />

      <SectionTitle title="Vendors" action="Approve" />
      <DataState isLoading={vendors.isLoading} error={vendors.error} empty={!vendors.data?.length}>
        {(vendors.data || []).map((vendor) => (
          <InfoCard
            key={vendor._id}
            title={vendor.store_name}
            subtitle={`${vendor.location?.city || 'City not set'} • ${vendor.user?.name || vendor.owner_name}`}
            status={vendor.user?.status}
            icon="store-outline"
          />
        ))}
      </DataState>
    </AppScreen>
  );
};

export default VendorListScreen;
