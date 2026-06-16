import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import VendorNavigator from './VendorNavigator';
import SalesNavigator from './SalesNavigator';
import ProductionNavigator from './ProductionNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import AdminNavigator from './AdminNavigator';
import AppOpeningLoader from '../components/AppOpeningLoader';

const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  const [showOpeningLoader, setShowOpeningLoader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowOpeningLoader(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || showOpeningLoader) {
    return <AppOpeningLoader />;
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
