import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/brand';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminVendorsScreen from '../screens/admin/AdminVendorsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminLogoutScreen from '../screens/admin/AdminLogoutScreen';
import { useApiResource } from '../hooks/useApiResource';
import { useRealtimeActionSound } from '../hooks/useRealtimeNotificationSound';

const Drawer = createDrawerNavigator();
const attentionOrderStatuses = ['Pending', 'Ready', 'Out for Delivery'];
const badgeValue = (count) => (count > 99 ? '99+' : count || undefined);

const DrawerLabel = ({ label, count, color }) => {
  const value = badgeValue(count);

  return (
    <View style={styles.drawerLabelRow}>
      <Text style={[styles.drawerLabelText, { color }]}>{label}</Text>
      {!!value && (
        <View style={styles.drawerBadge}>
          <Text style={styles.drawerBadgeText}>{value}</Text>
        </View>
      )}
    </View>
  );
};

const AdminNavigator = () => {
  const users = useApiResource('/admin/users', []);
  const orders = useApiResource('/orders', []);
  const accessBadge = (users.data || []).filter(
    (member) => member.passwordResetRequested || (member.role !== 'vendor' && member.status === 'pending')
  ).length;
  const ordersBadge = (orders.data || []).filter((order) => attentionOrderStatuses.includes(order.status)).length;

  useRealtimeActionSound({
    actions: ['created', 'verified', 'production-started', 'ready', 'delivery-assigned', 'status-updated'],
    entity: 'order',
    sound: 'order',
  });
  useRealtimeActionSound({ actions: ['accepted', 'delivered'], entity: 'delivery', sound: 'delivery' });

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '900' },
        drawerActiveBackgroundColor: colors.surface,
        drawerActiveTintColor: colors.red,
        drawerInactiveTintColor: colors.ink,
        drawerLabelStyle: { fontWeight: '800' },
        drawerStyle: { backgroundColor: colors.cream },
      }}
    >
      <Drawer.Screen 
        name="Admin Dashboard" 
        component={AdminDashboardScreen}
        options={{
          drawerIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard" size={22} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Orders" 
        component={AdminOrdersScreen}
        options={{
          drawerLabel: ({ color }) => <DrawerLabel label="Orders" count={ordersBadge} color={color} />,
          drawerIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-list" size={22} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Products" 
        component={AdminProductsScreen}
        options={{
          drawerIcon: ({ color }) => <MaterialCommunityIcons name="food" size={22} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Access" 
        component={AdminVendorsScreen}
        options={{
          drawerLabel: ({ color }) => <DrawerLabel label="Access" count={accessBadge} color={color} />,
          drawerIcon: ({ color }) => <MaterialCommunityIcons name="account-key" size={22} color={color} />
        }}
      />
      <Drawer.Screen 
        name="Analytics" 
        component={AdminAnalyticsScreen}
        options={{
          drawerIcon: ({ color }) => <MaterialCommunityIcons name="chart-bar" size={22} color={color} />
        }}
      />
      <Drawer.Screen
        name="Logout"
        component={AdminLogoutScreen}
        options={{
          drawerIcon: ({ color }) => <MaterialCommunityIcons name="logout" size={22} color={color} />
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  drawerLabelText: {
    fontSize: 14,
    fontWeight: '800',
  },
  drawerBadge: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 20,
    minWidth: 22,
    paddingHorizontal: 7,
  },
  drawerBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
});

export default AdminNavigator;
