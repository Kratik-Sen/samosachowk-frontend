import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/brand';
import SalesDashboardScreen from '../screens/sales/SalesDashboardScreen';
import VendorListScreen from '../screens/sales/VendorListScreen';
import OrderVerificationScreen from '../screens/sales/OrderVerificationScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen'; // Reusable profile
import { useApiResource } from '../hooks/useApiResource';
import { useDataArrivalSound } from '../hooks/useDataArrivalSound';

const Tab = createBottomTabNavigator();
const badgeValue = (count) => (count > 99 ? '99+' : count || undefined);

const SalesNavigator = () => {
  const verifyOrders = useApiResource('/orders?status=Pending,Ready', []);
  const verifyOrdersBadge = (verifyOrders.data || []).length;

  useDataArrivalSound({
    items: verifyOrders.data || [],
    isLoading: verifyOrders.isLoading,
    sound: 'dot',
    shouldWatch: (order) => ['Pending', 'Ready'].includes(order.status),
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'chart-line' : 'chart-line-variant';
          } else if (route.name === 'Vendors') {
            iconName = focused ? 'store' : 'store-outline';
          } else if (route.name === 'Verify Orders') {
            iconName = focused ? 'check-decagram' : 'check-decagram-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.softText,
        tabBarBadge: route.name === 'Verify Orders' ? badgeValue(verifyOrdersBadge) : undefined,
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
      <Tab.Screen name="Dashboard" component={SalesDashboardScreen} />
      <Tab.Screen name="Vendors" component={VendorListScreen} />
      <Tab.Screen name="Verify Orders" component={OrderVerificationScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default SalesNavigator;
