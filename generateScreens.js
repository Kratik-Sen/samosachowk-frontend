const fs = require('fs');
const path = require('path');

const screens = [
  'auth/LoginScreen.js',
  'auth/RegisterScreen.js',
  'auth/ForgotPasswordScreen.js',
  'vendor/VendorDashboardScreen.js',
  'vendor/PlaceOrderScreen.js',
  'vendor/OrderHistoryScreen.js',
  'vendor/WalletScreen.js',
  'vendor/ProfileScreen.js',
  'sales/SalesDashboardScreen.js',
  'sales/VendorListScreen.js',
  'sales/OrderVerificationScreen.js',
  'production/ProductionDashboardScreen.js',
  'production/QuantityTrackingScreen.js',
  'production/TeamAssignmentScreen.js',
  'delivery/DeliveryDashboardScreen.js',
  'delivery/DeliveryTrackingScreen.js',
  'delivery/PaymentCollectionScreen.js',
  'admin/AdminDashboardScreen.js',
  'admin/AdminOrdersScreen.js',
  'admin/AdminProductsScreen.js',
  'admin/AdminVendorsScreen.js',
  'admin/AdminAnalyticsScreen.js'
];

const template = (name) => `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ${name} = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>${name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDFCF6',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
});

export default ${name};
`;

const baseDir = path.join(__dirname, 'src', 'screens');

screens.forEach((screenPath) => {
  const fullPath = path.join(baseDir, screenPath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const screenName = path.basename(screenPath, '.js');
  
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, template(screenName));
    console.log(`Created ${screenPath}`);
  }
});
