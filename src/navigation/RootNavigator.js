import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/brand';
import AuthNavigator from './AuthNavigator';
import VendorNavigator from './VendorNavigator';
import SalesNavigator from './SalesNavigator';
import ProductionNavigator from './ProductionNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import AdminNavigator from './AdminNavigator';

const RootNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.red} />
      </View>
    );
  }

  // If not logged in, show Auth screens
  if (!user) {
    return <AuthNavigator />;
  }

  // Routing based on user role
  switch (user.role) {
    case 'vendor':
      return <VendorNavigator />;
    case 'sales':
      return <SalesNavigator />;
    case 'production':
      return <ProductionNavigator />;
    case 'delivery':
      return <DeliveryNavigator />;
    case 'admin':
      return <AdminNavigator />;
    default:
      // Fallback
      return <AuthNavigator />;
  }
};

export default RootNavigator;
