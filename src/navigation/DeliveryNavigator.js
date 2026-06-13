import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/brand';
import DeliveryDashboardScreen from '../screens/delivery/DeliveryDashboardScreen';
import DeliveryTrackingScreen from '../screens/delivery/DeliveryTrackingScreen';
import PaymentCollectionScreen from '../screens/delivery/PaymentCollectionScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen';
import { useApiResource } from '../hooks/useApiResource';
import { useDataArrivalSound } from '../hooks/useDataArrivalSound';

const Tab = createBottomTabNavigator();
const badgeValue = (count) => (count > 99 ? '99+' : count || undefined);

const DeliveryNavigator = () => {
  const deliveries = useApiResource('/delivery/dashboard?scope=active', []);
  const assignedBadge = (deliveries.data || []).filter((delivery) => delivery.status === 'Assigned').length;
  const trackingBadge = (deliveries.data || []).filter((delivery) => delivery.status !== 'Delivered').length;
  const paymentsBadge = (deliveries.data || []).filter(
    (delivery) => delivery.order?.payment_method === 'COD' && !delivery.payment_collected
  ).length;

  useDataArrivalSound({
    items: deliveries.data || [],
    isLoading: deliveries.isLoading,
    sound: 'delivery',
    shouldWatch: (delivery) => delivery.status === 'Assigned',
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'moped' : 'moped-outline';
          } else if (route.name === 'Tracking') {
            iconName = focused ? 'map-marker-path' : 'map-marker-outline';
          } else if (route.name === 'Payments') {
            iconName = focused ? 'cash-multiple' : 'cash';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.softText,
        tabBarBadge:
          route.name === 'Dashboard'
            ? badgeValue(assignedBadge)
            : route.name === 'Tracking'
              ? badgeValue(trackingBadge)
              : route.name === 'Payments'
                ? badgeValue(paymentsBadge)
                : undefined,
        tabBarBadgeStyle: { backgroundColor: colors.red, color: colors.white, fontWeight: '900' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DeliveryDashboardScreen} />
      <Tab.Screen name="Tracking" component={DeliveryTrackingScreen} />
      <Tab.Screen name="Payments" component={PaymentCollectionScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default DeliveryNavigator;
