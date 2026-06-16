import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import VendorNavigator from './VendorNavigator';
import SalesNavigator from './SalesNavigator';
import ProductionNavigator from './ProductionNavigator';
import DeliveryNavigator from './DeliveryNavigator';
import AdminNavigator from './AdminNavigator';
import AppOpeningLoader from '../components/AppOpeningLoader';

const OPENING_ANIMATION_MS = 2500;

const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  const [showOpeningAnimation, setShowOpeningAnimation] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowOpeningAnimation(false), OPENING_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (showOpeningAnimation) {
    return <AppOpeningLoader />;
  }

  if (isLoading) {
    return null;
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
