import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeMode } from '../context/ThemeContext';
import SalesDashboardScreen from '../screens/sales/SalesDashboardScreen';
import VendorListScreen from '../screens/sales/VendorListScreen';
import OrderVerificationScreen from '../screens/sales/OrderVerificationScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen'; // Reusable profile
import { useApiResource } from '../hooks/useApiResource';
import { useDataArrivalSound } from '../hooks/useDataArrivalSound';
import { getPanelTabScreenOptions } from './tabBarTheme';

const Tab = createBottomTabNavigator();
const badgeValue = (count) => (count > 99 ? '99+' : count || undefined);

const SalesNavigator = () => {
  const { palette } = useThemeMode();
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
        ...getPanelTabScreenOptions(palette),
        tabBarBadge: route.name === 'Verify Orders' ? badgeValue(verifyOrdersBadge) : undefined,
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
