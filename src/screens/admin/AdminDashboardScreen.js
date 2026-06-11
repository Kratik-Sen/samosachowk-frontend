import React from 'react';
import { AppScreen, BrandHero, DataState, InfoCard, MetricGrid, SectionTitle } from '../../components/SamosaUI';
import { colors, formatMoney, images } from '../../theme/brand';
import { useApiResource } from '../../hooks/useApiResource';

const AdminDashboardScreen = () => {
  const overview = useApiResource('/admin/overview', {
    orderStats: {},
    teamCounts: {},
    recentOrders: [],
  });
  const data = overview.data || {};

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Admin control"
        title="Samosa Chowk operations"
        subtitle="A single command center for orders, vendors, menu, sales, and fulfillment."
        image={images.heroSamosa}
      />

      <MetricGrid
        metrics={[
          { label: 'Revenue', value: formatMoney(data.orderStats?.revenue), icon: 'chart-areaspline', tone: colors.green },
          { label: 'Orders', value: `${data.orderStats?.totalOrders || 0}`, icon: 'receipt-text', tone: colors.red },
          { label: 'Vendors', value: `${data.teamCounts?.vendor || 0}`, icon: 'store', tone: colors.amber },
          { label: 'Active deliveries', value: `${data.activeDeliveries || 0}`, icon: 'truck-check', tone: colors.blue },
        ]}
      />

      <SectionTitle title="Live Orders" />
      <DataState isLoading={overview.isLoading} error={overview.error} empty={!data.recentOrders?.length}>
        {(data.recentOrders || []).map((order) => (
          <InfoCard
            key={order._id}
            title={`${order._id?.slice(-6).toUpperCase()} - ${order.customer_name}`}
            subtitle={(order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ')}
            right={formatMoney(order.final_amount)}
            status={order.status}
            icon="clipboard-list-outline"
          />
        ))}
      </DataState>
    </AppScreen>
  );
};

export default AdminDashboardScreen;
