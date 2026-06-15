import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, formatMoney, imageSource, images } from '../theme/brand';

const statusColors = {
  active: colors.green,
  Active: colors.green,
  pending: colors.amber,
  Pending: colors.amber,
  inactive: colors.muted,
  suspended: colors.red,
  Hot: colors.red,
  Popular: colors.amber,
  New: colors.blue,
  Ready: colors.green,
  Verified: colors.green,
  'In Production': colors.amber,
  'Out for Delivery': colors.blue,
  Delivered: colors.green,
  Assigned: colors.amber,
  'Picked Up': colors.blue,
  Completed: colors.green,
  'In Progress': colors.amber,
};

const metricCardShadow = {
  boxShadow: `0 6px 12px ${colors.shadow}`,
};

export const AppScreen = ({ children }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isAppScreenMountedRef = useRef(true);

  useEffect(() => () => {
    isAppScreenMountedRef.current = false;
  }, []);

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    const adminRoutes = ['Admin Dashboard', 'Orders', 'Products', 'Access', 'Analytics', 'Logout'];
    const fallbackRoute = adminRoutes.includes(route.name) ? 'Admin Dashboard' : 'Dashboard';

    if (route.name !== fallbackRoute) {
      navigation.navigate(fallbackRoute);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      if (isAppScreenMountedRef.current) {
        setIsLoggingOut(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panelActions}>
          <Pressable style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} onPress={goBack}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.ink} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Pressable
            disabled={isLoggingOut}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed, isLoggingOut && styles.disabled]}
            onPress={handleLogout}
          >
            {isLoggingOut ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <MaterialCommunityIcons name="logout" size={20} color={colors.white} />
            )}
            <Text style={styles.logoutText}>{isLoggingOut ? 'Loading...' : 'Logout'}</Text>
          </Pressable>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

export const BrandHero = ({
  eyebrow,
  title,
  subtitle,
  image = images.heroSamosa,
  compact = false,
}) => (
  <View style={[styles.hero, compact && styles.heroCompact]}>
    <View style={styles.heroText}>
      <Image source={imageSource(images.logo)} style={styles.logo} resizeMode="contain" />
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text style={styles.heroTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
    </View>
    <ImageBackground source={imageSource(image)} style={styles.heroImage} imageStyle={styles.heroImageInner}>
      <View style={styles.heroImageShade} />
    </ImageBackground>
  </View>
);

export const SectionTitle = ({ title, action }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {!!action && <Text style={styles.sectionAction}>{action}</Text>}
  </View>
);

export const MetricGrid = ({ metrics }) => (
  <View style={styles.metricGrid}>
    {metrics.map((metric) => (
      <MetricCard key={metric.label} {...metric} />
    ))}
  </View>
);

export const MetricCard = ({ label, value, icon = 'chart-box', tone = colors.red }) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIcon, { backgroundColor: `${tone}1A` }]}>
      <MaterialCommunityIcons name={icon} size={20} color={tone} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

export const StatusPill = ({ status }) => {
  const tone = statusColors[status] || colors.ink;

  return (
    <View style={[styles.pill, { backgroundColor: `${tone}1A`, borderColor: `${tone}33` }]}>
      <Text style={[styles.pillText, { color: tone }]}>{status}</Text>
    </View>
  );
};

export const FoodCard = ({ item, onPress }) => (
  <Pressable style={({ pressed }) => [styles.foodCard, pressed && styles.pressed]} onPress={onPress}>
    <Image source={imageSource(item.image || images.heroSamosa)} style={styles.foodImage} />
    <View style={styles.foodContent}>
      <View style={styles.foodTop}>
        <Text style={styles.foodCategory}>{item.category || 'Menu'}</Text>
        <StatusPill status={item.status || 'Active'} />
      </View>
      <Text style={styles.foodTitle}>{item.name}</Text>
      <Text style={styles.foodMeta}>{item.pack || item.packages?.[0] || 'Standard pack'}</Text>
      <Text style={styles.foodPrice}>{formatMoney(item.price)}</Text>
    </View>
  </Pressable>
);

export const InfoCard = ({ title, subtitle, right, icon = 'receipt-text-outline', image, onPress, status }) => {
  const content = (
    <>
      {image ? (
        <Image source={imageSource(image)} style={styles.infoImage} />
      ) : (
        <View style={styles.infoIcon}>
          <MaterialCommunityIcons name={icon} size={22} color={colors.red} />
        </View>
      )}
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
        {!!status && (
          <View style={styles.infoPillWrap}>
            <StatusPill status={status} />
          </View>
        )}
      </View>
      {!!right && <Text style={styles.infoRight}>{right}</Text>}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [styles.infoCard, pressed && styles.pressed]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.infoCard}>{content}</View>;
};

export const PrimaryButton = ({
  label,
  icon = 'arrow-right',
  onPress,
  tone = colors.red,
  disabled = false,
  loading = false,
  loadingLabel = 'Loading...',
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isMountedRef = useRef(true);
  const isBusy = loading || internalLoading;
  const isDisabled = disabled || isBusy;

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const handlePress = async () => {
    if (isDisabled || !onPress) {
      return;
    }

    try {
      const result = onPress();

      if (result && typeof result.then === 'function') {
        setInternalLoading(true);
        await result;
      }
    } finally {
      if (isMountedRef.current) {
        setInternalLoading(false);
      }
    }
  };

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: tone },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      onPress={handlePress}
    >
      {isBusy ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <MaterialCommunityIcons name={icon} size={20} color={colors.white} />
      )}
      <Text style={styles.primaryButtonText}>{isBusy ? loadingLabel : label}</Text>
    </Pressable>
  );
};

export const ProgressBar = ({ value, color = colors.red }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
  </View>
);

export const DataState = ({ isLoading, error, empty, children }) => {
  if (isLoading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator color={colors.red} />
        <Text style={styles.stateText}>Loading from database...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateBox}>
        <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.red} />
        <Text style={styles.stateText}>{error}</Text>
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.stateBox}>
        <MaterialCommunityIcons name="database-search" size={22} color={colors.amber} />
        <Text style={styles.stateText}>No records found in database.</Text>
      </View>
    );
  }

  return children;
};

export const BatchCard = ({ batch }) => {
  const percent = Math.round((batch.done / batch.planned) * 100);

  return (
    <View style={styles.batchCard}>
      <View style={styles.batchTop}>
        <Text style={styles.batchTitle}>{batch.name}</Text>
        <StatusPill status={batch.status} />
      </View>
      <Text style={styles.batchMeta}>
        {batch.done} of {batch.planned} units ready
      </Text>
      <ProgressBar value={percent} color={batch.status === 'Completed' ? colors.green : colors.amber} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flex: 1,
  },
  screenContent: {
    padding: 18,
    paddingBottom: 110,
  },
  panelActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  logoutText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 8,
    minHeight: 220,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroCompact: {
    minHeight: 176,
  },
  heroText: {
    padding: 18,
    position: 'relative',
    zIndex: 2,
    maxWidth: 420,
  },
  logo: {
    width: 112,
    height: 80,
    marginBottom: 4,
  },
  eyebrow: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  heroSubtitle: {
    color: '#FFFFFFD9',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  heroImage: {
    bottom: 0,
    height: 130,
    position: 'absolute',
    right: 0,
    width: 190,
  },
  heroImageInner: {
    opacity: 0.78,
  },
  heroImageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000033',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionAction: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 122,
    padding: 14,
    ...metricCardShadow,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    marginBottom: 12,
    width: 34,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  foodCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    overflow: 'hidden',
  },
  foodImage: {
    backgroundColor: colors.surface,
    height: 124,
    width: 118,
  },
  foodContent: {
    flex: 1,
    padding: 12,
  },
  foodTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  foodCategory: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  foodTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  foodMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  foodPrice: {
    color: colors.green,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  infoCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    minHeight: 86,
    padding: 12,
  },
  infoIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  infoImage: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 54,
    marginRight: 12,
    width: 54,
  },
  infoMain: {
    flex: 1,
  },
  infoTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  infoSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  infoPillWrap: {
    marginTop: 8,
  },
  infoRight: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 10,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: '#1C1C1C14',
    borderRadius: 999,
    height: 8,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  batchCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  batchTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  batchTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    paddingRight: 10,
  },
  batchMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.55,
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
    minHeight: 96,
    padding: 16,
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
