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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const seekToStart = async (player) => {
  try {
    if (player?.seekTo) {
      await player.seekTo(0);
    }
  } catch {
    // Some platforms cannot seek until the asset is fully ready. The next play still works.
  }
};

const primePlayer = async (player) => {
  if (!player) {
    return;
  }

  const previousVolume = typeof player.volume === 'number' ? player.volume : undefined;

  try {
    await ensureAudioMode();

    if (previousVolume !== undefined) {
      player.volume = 0;
    }

    await seekToStart(player);
    player.play();
    await sleep(80);

    if (player.pause) {
      player.pause();
    }

    await seekToStart(player);
  } finally {
    if (previousVolume !== undefined) {
      player.volume = previousVolume;
    }
  }
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

  useEffect(() => {
    if (!source || !player || typeof document === 'undefined') {
      return undefined;
    }

    let hasPrimed = false;
    const events = ['pointerdown', 'touchstart', 'keydown'];

    const removeListeners = () => {
      events.forEach((eventName) => {
        document.removeEventListener(eventName, unlockAudio, true);
      });
    };

    const unlockAudio = () => {
      if (hasPrimed) {
        return;
      }

      hasPrimed = true;
      primePlayer(player)
        .catch(() => {
          hasPrimed = false;
        })
        .finally(() => {
          if (hasPrimed) {
            removeListeners();
          }
        });
    };

    events.forEach((eventName) => {
      document.addEventListener(eventName, unlockAudio, true);
    });

    return removeListeners;
  }, [player, source]);

  return useCallback(async () => {
    if (!source || !player) {
      return;
    }

    try {
      await ensureAudioMode();

      if (player.playing) {
        player.pause();
      }

      await seekToStart(player);

      player.play();
    } catch (error) {
      console.warn('Unable to play notification sound', error);
    }
  }, [player, source]);
};
