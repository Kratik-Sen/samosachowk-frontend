import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeMode } from '../context/ThemeContext';
import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import PlaceOrderScreen from '../screens/vendor/PlaceOrderScreen';
import OrderHistoryScreen from '../screens/vendor/OrderHistoryScreen';
import WalletScreen from '../screens/vendor/WalletScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen';
import ContactScreen from '../screens/ContactScreen';
import { useAuth } from '../context/AuthContext';
import { useApiResource } from '../hooks/useApiResource';
import { getPanelTabScreenOptions } from './tabBarTheme';

const Tab = createBottomTabNavigator();
const activeOrderStatuses = ['Pending', 'Verified', 'In Production', 'Ready', 'Out for Delivery'];
const badgeValue = (count) => (count > 99 ? '99+' : count || undefined);

const VendorNavigator = () => {
  const { user } = useAuth();
  const { palette } = useThemeMode();
  const profile = useApiResource('/vendors/profile', null);
  const orders = useApiResource('/vendors/orders?scope=active', []);
  const wallet = useApiResource('/wallet', { reward_redemptions: [] });
  const historyBadge = (orders.data || []).filter((order) => activeOrderStatuses.includes(order.status)).length;
  const walletBadge = (wallet.data?.reward_redemptions || []).filter((request) => request.status === 'pending').length;
  const mustCompleteProfile =
    user?.vendor_profile_complete === false ||
    (user?.vendor_profile_complete !== true && profile.data?.profile_complete === false);

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
          } else if (route.name === 'Contact') {
            iconName = focused ? 'map-marker-radius' : 'map-marker-radius-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        ...getPanelTabScreenOptions(palette),
        tabBarBadge:
          mustCompleteProfile
            ? undefined
            : route.name === 'History'
            ? badgeValue(historyBadge)
            : route.name === 'Wallet'
              ? badgeValue(walletBadge)
              : undefined,
      })}
    >
      {mustCompleteProfile ? (
        <Tab.Screen name="Profile">
          {() => <ProfileScreen completionOnly />}
        </Tab.Screen>
      ) : (
        <>
          <Tab.Screen name="Dashboard" component={VendorDashboardScreen} />
          <Tab.Screen name="Place Order" component={PlaceOrderScreen} />
          <Tab.Screen name="History" component={OrderHistoryScreen} />
          <Tab.Screen name="Wallet" component={WalletScreen} />
          <Tab.Screen name="Contact" component={ContactScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
};

export default VendorNavigator;
