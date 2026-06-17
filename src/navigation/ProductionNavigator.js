import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeMode } from '../context/ThemeContext';
import ProductionDashboardScreen from '../screens/production/ProductionDashboardScreen';
import QuantityTrackingScreen from '../screens/production/QuantityTrackingScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen';
import ContactScreen from '../screens/ContactScreen';
import { useApiResource } from '../hooks/useApiResource';
import { useDataArrivalSound } from '../hooks/useDataArrivalSound';
import { getPanelTabScreenOptions } from './tabBarTheme';

const Tab = createBottomTabNavigator();
const badgeValue = (count) => (count > 99 ? '99+' : count || undefined);

const ProductionNavigator = () => {
  const { palette } = useThemeMode();
  const orders = useApiResource('/production/orders', []);
  const trackingBadge = (orders.data || []).filter((order) => order.status === 'Verified').length;

  useDataArrivalSound({
    items: orders.data || [],
    isLoading: orders.isLoading,
    sound: 'dot',
    shouldWatch: (order) => order.status === 'Verified',
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'factory' : 'factory';
          } else if (route.name === 'Tracking') {
            iconName = focused ? 'clipboard-text' : 'clipboard-text-outline';
          } else if (route.name === 'Contact') {
            iconName = focused ? 'map-marker-radius' : 'map-marker-radius-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        ...getPanelTabScreenOptions(palette),
        tabBarBadge: route.name === 'Tracking' ? badgeValue(trackingBadge) : undefined,
      })}
    >
      <Tab.Screen name="Dashboard" component={ProductionDashboardScreen} />
      <Tab.Screen name="Tracking" component={QuantityTrackingScreen} />
      <Tab.Screen name="Contact" component={ContactScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default ProductionNavigator;
