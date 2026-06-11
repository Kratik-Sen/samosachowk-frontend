import React from 'react';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const summarizeItems = (order) =>
  (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ');

const ProductionDashboardScreen = () => {
  const orders = useApiResource('/production/orders', []);
  const verified = (orders.data || []).filter((order) => order.status === 'Verified').length;
  const inProduction = (orders.data || []).filter((order) => order.status === 'In Production').length;
  const totalUnits = (orders.data || []).reduce(
    (sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
    0
  );

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Production floor"
        title="Order queue in motion"
        subtitle="Prepare sales-verified vendor orders, update progress, and return completed orders to sales dispatch."
        image={images.heroSamosa}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Waiting', value: `${verified}`, icon: 'clipboard-clock', tone: colors.amber },
          { label: 'In production', value: `${inProduction}`, icon: 'factory', tone: colors.red },
          { label: 'Units in queue', value: `${totalUnits}`, icon: 'package-variant', tone: colors.green },
          { label: 'Order value', value: formatMoney((orders.data || []).reduce((sum, order) => sum + Number(order.final_amount || 0), 0)), icon: 'cash-multiple', tone: colors.blue },
        ]}
      />

      <SectionTitle title="Production Queue" />
      <DataState isLoading={orders.isLoading} error={orders.error} empty={!orders.data?.length}>
        {(orders.data || []).map((order) => (
          <InfoCard
            key={order._id}
            title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
            subtitle={summarizeItems(order)}
            right={formatMoney(order.final_amount)}
            status={order.status}
            icon="factory"
          />
        ))}
      </DataState>
    </AppScreen>
  );
};

export default ProductionDashboardScreen;
