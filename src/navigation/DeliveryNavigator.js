import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeMode } from '../context/ThemeContext';
import DeliveryDashboardScreen from '../screens/delivery/DeliveryDashboardScreen';
import DeliveryTrackingScreen from '../screens/delivery/DeliveryTrackingScreen';
import PaymentCollectionScreen from '../screens/delivery/PaymentCollectionScreen';
import ProfileScreen from '../screens/vendor/ProfileScreen';
import { useApiResource } from '../hooks/useApiResource';
import { useDataArrivalSound } from '../hooks/useDataArrivalSound';

const Tab = createBottomTabNavigator();
const badgeValue = (count) => (count > 99 ? '99+' : count || undefined);

const DeliveryNavigator = () => {
  const { palette } = useThemeMode();
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
        tabBarActiveTintColor: palette.activeTint,
        tabBarInactiveTintColor: palette.softText,
        tabBarActiveBackgroundColor: palette.activeSurface,
        tabBarBadge:
          route.name === 'Dashboard'
            ? badgeValue(assignedBadge)
            : route.name === 'Tracking'
              ? badgeValue(trackingBadge)
              : route.name === 'Payments'
                ? badgeValue(paymentsBadge)
                : undefined,
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
      <Tab.Screen name="Dashboard" component={DeliveryDashboardScreen} />
      <Tab.Screen name="Tracking" component={DeliveryTrackingScreen} />
      <Tab.Screen name="Payments" component={PaymentCollectionScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default DeliveryNavigator;
