import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeMode } from '../context/ThemeContext';
import ProductionDashboardScreen from '../screens/production/ProductionDashboardScreen';
import QuantityTrackingScreen from '../screens/production/QuantityTrackingScreen';
import TeamAssignmentScreen from '../screens/production/TeamAssignmentScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen';
import { useApiResource } from '../hooks/useApiResource';
import { useDataArrivalSound } from '../hooks/useDataArrivalSound';

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
          } else if (route.name === 'Team') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: palette.activeTint,
        tabBarInactiveTintColor: palette.softText,
        tabBarActiveBackgroundColor: palette.activeSurface,
        tabBarBadge: route.name === 'Tracking' ? badgeValue(trackingBadge) : undefined,
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
      <Tab.Screen name="Dashboard" component={ProductionDashboardScreen} />
      <Tab.Screen name="Tracking" component={QuantityTrackingScreen} />
      <Tab.Screen name="Team" component={TeamAssignmentScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default ProductionNavigator;
