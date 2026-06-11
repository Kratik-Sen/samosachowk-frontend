import React from 'react';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const AdminOrdersScreen = () => {
  const orders = useApiResource('/orders', []);
  const pending = (orders.data || []).filter((order) => order.status !== 'Delivered').length;
  const delivered = (orders.data || []).filter((order) => order.status === 'Delivered').length;

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Order monitor"
        title="All order stages"
        subtitle="From vendor cart to delivered snack carton, every order is visible."
        image={images.bulk}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Pending', value: `${pending}`, icon: 'timer-sand', tone: colors.amber },
          { label: 'Delivered', value: `${delivered}`, icon: 'check-circle', tone: colors.green },
        ]}
      />

      <SectionTitle title="Orders" action="Filter" />
      <DataState isLoading={orders.isLoading} error={orders.error} empty={!orders.data?.length}>
        {(orders.data || []).map((order) => (
          <InfoCard
            key={order._id}
            title={order._id?.slice(-6).toUpperCase()}
            subtitle={`${order.customer_name} - ${order.order_type || 'Regular'} - ${order.payment_status}`}
            right={formatMoney(order.final_amount)}
            status={order.status}
            icon="receipt"
          />
        ))}
      </DataState>
    </AppScreen>
  );
};

export default AdminOrdersScreen;
