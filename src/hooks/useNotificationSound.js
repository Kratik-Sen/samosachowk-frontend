import { useCallback, useEffect } from 'react';
import { preload, setAudioModeAsync, useAudioPlayer } from 'expo-audio';

const soundSources = {
  order: require('../../assets/order.mp3'),
  dot: require('../../assets/dot.mp3'),
  delivery: require('../../assets/delivery.mp3'),
};

const preloadSoundSource = (source) => {
  try {
    const preloadResult = preload(source);

    if (preloadResult?.catch) {
      preloadResult.catch(() => {});
    }
  } catch {
    // The managed player below still loads the asset if eager preload is unavailable.
  }
};

Object.values(soundSources).forEach(preloadSoundSource);

let audioModePromise = null;

const ensureAudioMode = () => {
  if (!audioModePromise) {
    audioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch((error) => {
      audioModePromise = null;
      throw error;
    });
  }

  return audioModePromise;
};

export const useNotificationSound = (soundName) => {
  const source = soundSources[soundName] || null;
  const player = useAudioPlayer(source, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });

  useEffect(() => {
    if (!source) {
      return undefined;
    }

    ensureAudioMode().catch((error) => {
      console.warn('Unable to prepare notification audio', error);
    });

    return undefined;
  }, [source]);

  return useCallback(async () => {
    if (!source || !player) {
      return;
    }

    try {
      await ensureAudioMode();

      if (player.playing) {
        player.pause();
      }

      if (player.isLoaded) {
        await player.seekTo(0);
      }

      player.play();
    } catch (error) {
      console.warn('Unable to play notification sound', error);
    }
  }, [player, source]);
};
