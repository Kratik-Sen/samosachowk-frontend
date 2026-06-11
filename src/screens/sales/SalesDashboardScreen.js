import React from 'react';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const SalesDashboardScreen = () => {
  const dashboard = useApiResource('/sales/dashboard', {
    totalVendors: 0,
    pendingVendors: 0,
    pendingOrders: 0,
    readyOrders: 0,
    activeDeliveryBoys: 0,
  });
  const orders = useApiResource('/orders', []);
  const revenue = (orders.data || []).reduce((sum, order) => sum + Number(order.final_amount || 0), 0);

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Sales desk"
        title="Keep the chowk moving"
        subtitle="Approve vendors, verify large orders, and watch revenue move through the day."
        image={images.catering}
        compact
      />

      <MetricGrid
        metrics={[
          { label: 'Revenue', value: formatMoney(revenue), icon: 'chart-line', tone: colors.green },
          { label: 'Pending orders', value: `${dashboard.data?.pendingOrders || 0}`, icon: 'clipboard-clock', tone: colors.amber },
          { label: 'Ready orders', value: `${dashboard.data?.readyOrders || 0}`, icon: 'package-check', tone: colors.blue },
          { label: 'Vendors', value: `${dashboard.data?.totalVendors || 0}`, icon: 'store', tone: colors.red },
        ]}
      />

      <SectionTitle title="Order Pipeline" />
      <DataState isLoading={orders.isLoading || dashboard.isLoading} error={orders.error || dashboard.error} empty={!orders.data?.length}>
        {(orders.data || []).slice(0, 8).map((order) => (
          <InfoCard
            key={order._id}
            title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
            subtitle={(order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ')}
            right={formatMoney(order.final_amount)}
            status={order.status}
            icon="check-decagram-outline"
          />
        ))}
      </DataState>
    </AppScreen>
  );
};

export default SalesDashboardScreen;
