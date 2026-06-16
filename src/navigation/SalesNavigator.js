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
        tabBarActiveTintColor: palette.activeTint,
        tabBarInactiveTintColor: palette.softText,
        tabBarActiveBackgroundColor: palette.activeSurface,
        tabBarBadge: route.name === 'Verify Orders' ? badgeValue(verifyOrdersBadge) : undefined,
        tabBarBadgeStyle: { backgroundColor: palette.red, color: palette.onBrand, fontWeight: '900' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarItemStyle: { borderRadius: 999, marginHorizontal: 4, marginVertical: 6 },
        tabBarStyle: {
          backgroundColor: palette.white,
          borderColor: palette.contrastBorder,
          borderRadius: 999,
          borderTopWidth: 1,
          borderWidth: 1,
          bottom: 10,
          boxShadow: `0 10px 28px ${palette.shadow}`,
          elevation: 10,
          height: 72,
          left: 8,
          paddingBottom: 8,
          paddingHorizontal: 6,
          paddingTop: 8,
          position: 'absolute',
          right: 8,
        },
        animation: 'shift',
        sceneStyle: { backgroundColor: palette.appBg },
        transitionSpec: {
          animation: 'timing',
          config: { duration: 180 },
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
