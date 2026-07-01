import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppScreen, BrandHero, InfoCard, SectionTitle } from '../components/SamosaUI';
import { colors, images, shadows } from '../theme/brand';
import { canRenderNativeMap, nativeMapSetupMessage } from '../utils/nativeMaps';

const HEAD_OFFICE_MAP_URL = 'https://www.google.com/maps?q=22.9446041,72.5882271';
const HEAD_OFFICE_EMBED_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3674.1526643527372!2d72.5882271!3d22.9446041!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e8f17eb153f01%3A0x8d8cd296f79c0a00!2sSAMOSA%20CHOWK!5e0!3m2!1sen!2sin!4v1781690739347!5m2!1sen!2sin';
const HEAD_OFFICE_COORDINATE = { latitude: 22.9446041, longitude: 72.5882271 };

const ContactScreen = () => {
  const openHeadOfficeMap = () => {
    Linking.openURL(HEAD_OFFICE_MAP_URL);
  };

  return (
    <AppScreen>
      <BrandHero
        eyebrow="Contact"
        title="Head office"
        subtitle="Reach Samosa Chowk support and view the head office location."
        image={images.catering}
        compact
      />

      <SectionTitle title="Head Office Location" />
      <InfoCard
        title="Samosa Chowk Head Office"
        subtitle="Open the live Google Maps location for directions."
        right="Map"
        icon="map-marker"
      />

      <View style={styles.mapSection}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            title: 'Samosa Chowk head office map',
            src: HEAD_OFFICE_EMBED_URL,
            loading: 'lazy',
            allowFullScreen: true,
            referrerPolicy: 'no-referrer-when-downgrade',
            style: {
              border: 0,
              height: '100%',
              width: '100%',
            },
          })
        ) : canRenderNativeMap ? (
          (() => {
            const maps = require('react-native-maps');
            const MapView = maps.default;
            const Marker = maps.Marker;
            const ProviderGoogle = maps.PROVIDER_GOOGLE;

            return (
              <MapView
                style={styles.nativeMap}
                provider={Platform.OS === 'android' ? ProviderGoogle : undefined}
                initialRegion={{
                  ...HEAD_OFFICE_COORDINATE,
                  latitudeDelta: 0.012,
                  longitudeDelta: 0.012,
                }}
                mapType="standard"
                userInterfaceStyle="light"
                toolbarEnabled={false}
              >
                <Marker
                  coordinate={HEAD_OFFICE_COORDINATE}
                  title="Samosa Chowk Head Office"
                  description="Tap Open Head Office Map for directions."
                />
              </MapView>
            );
          })()
        ) : (
          <View style={styles.mapFallback}>
            <MaterialCommunityIcons name="map-marker-radius" size={34} color={colors.red} />
            <Text style={styles.mapFallbackText}>{nativeMapSetupMessage}</Text>
          </View>
        )}
      </View>

      <Pressable style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]} onPress={openHeadOfficeMap}>
        <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.onBrand} />
        <Text style={styles.mapButtonText}>Open Head Office Map</Text>
      </Pressable>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  mapSection: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 320,
    marginBottom: 14,
    overflow: 'hidden',
    ...shadows.card,
  },
  nativeMap: {
    height: '100%',
    width: '100%',
  },
  mapFallback: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 18,
  },
  mapFallbackText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  mapButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.black,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 2,
    minHeight: 48,
    ...shadows.soft,
  },
  mapButtonText: {
    color: colors.onBrand,
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.84,
  },
});

export default ContactScreen;
