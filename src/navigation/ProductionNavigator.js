import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/brand';
import ProductionDashboardScreen from '../screens/production/ProductionDashboardScreen';
import QuantityTrackingScreen from '../screens/production/QuantityTrackingScreen';
import TeamAssignmentScreen from '../screens/production/TeamAssignmentScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen';
import { useApiResource } from '../hooks/useApiResource';
import { useRealtimeActionSound } from '../hooks/useRealtimeNotificationSound';

const Tab = createBottomTabNavigator();
const badgeValue = (count) => (count > 99 ? '99+' : count || undefined);

const ProductionNavigator = () => {
  const orders = useApiResource('/production/orders', []);
  const trackingBadge = (orders.data || []).filter((order) => order.status === 'Verified').length;

  useRealtimeActionSound({ actions: ['verified'], sound: 'dot' });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'factory' : 'factory';
          } else if (route.name === 'Tracking') {
            iconName = focused ? 'clipboard-text' : 'clipboard-text-outline';
          } else if (route.name === 'Team') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.softText,
        tabBarBadge: route.name === 'Tracking' ? badgeValue(trackingBadge) : undefined,
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
      <Tab.Screen name="Dashboard" component={ProductionDashboardScreen} />
      <Tab.Screen name="Tracking" component={QuantityTrackingScreen} />
      <Tab.Screen name="Team" component={TeamAssignmentScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default ProductionNavigator;
