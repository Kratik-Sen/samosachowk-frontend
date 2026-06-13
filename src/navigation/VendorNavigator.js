import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/brand';
import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import PlaceOrderScreen from '../screens/vendor/PlaceOrderScreen';
import OrderHistoryScreen from '../screens/vendor/OrderHistoryScreen';
import WalletScreen from '../screens/vendor/WalletScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen';
import { useApiResource } from '../hooks/useApiResource';
import { useRealtimeActionSound } from '../hooks/useRealtimeNotificationSound';

const Tab = createBottomTabNavigator();
const activeOrderStatuses = ['Pending', 'Verified', 'In Production', 'Ready', 'Out for Delivery'];
const badgeValue = (count) => (count > 99 ? '99+' : count || undefined);

const VendorNavigator = () => {
  const orders = useApiResource('/vendors/orders?scope=active', []);
  const historyBadge = (orders.data || []).filter((order) => activeOrderStatuses.includes(order.status)).length;

  useRealtimeActionSound({
    actions: ['verified', 'production-started', 'ready', 'delivery-assigned', 'status-updated'],
    entity: 'order',
    sound: 'dot',
  });
  useRealtimeActionSound({ actions: ['accepted', 'delivered'], entity: 'delivery', sound: 'delivery' });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Place Order') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
          } else if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.softText,
        tabBarBadge: route.name === 'History' ? badgeValue(historyBadge) : undefined,
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
      <Tab.Screen name="Dashboard" component={VendorDashboardScreen} />
      <Tab.Screen name="Place Order" component={PlaceOrderScreen} />
      <Tab.Screen name="History" component={OrderHistoryScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default VendorNavigator;
