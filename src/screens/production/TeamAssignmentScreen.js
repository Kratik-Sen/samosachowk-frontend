import React from 'react';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, SectionTitle } from '../../components/SamosaUI';
import { colors, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const TeamAssignmentScreen = () => {
  const batches = useApiResource('/production/dashboard', []);
  const assigned = (batches.data || []).filter((batch) => batch.assigned_to?.length).length;

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Crew assignment"
        title="Right team, right station"
        subtitle="Balance staff across prep, frying, packing, and dispatch."
        image={images.bulk}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Assigned batches', value: `${assigned}`, icon: 'chef-hat', tone: colors.red },
          { label: 'Unassigned', value: `${(batches.data || []).length - assigned}`, icon: 'package-variant-closed', tone: colors.green },
        ]}
      />

      <SectionTitle title="Team Board" />
      <DataState isLoading={batches.isLoading} error={batches.error} empty={!batches.data?.length}>
        {(batches.data || []).map((batch) => (
          <InfoCard
            key={batch._id}
            title={batch.product?.name || 'Production batch'}
            subtitle={`${batch.assigned_to?.length || 0} team members assigned`}
            status={batch.status}
            icon="account-hard-hat"
          />
        ))}
      </DataState>
    </AppScreen>
  );
};

export default TeamAssignmentScreen;
