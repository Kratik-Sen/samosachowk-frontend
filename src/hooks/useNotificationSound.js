import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const soundSources = {
  order: require('../../assets/order.mp3'),
  dot: require('../../assets/dot.mp3'),
  delivery: require('../../assets/delivery.mp3'),
};

let audioModeReady = false;

const ensureAudioMode = () => {
  if (audioModeReady) {
    return;
  }

  audioModeReady = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
    audioModeReady = false;
  });
};

export const useNotificationSound = (soundName) => {
  const playerRef = useRef(null);

  useEffect(() => {
    const source = soundSources[soundName];

    if (!source) {
      return undefined;
    }

    ensureAudioMode();
    const player = createAudioPlayer(source);
    playerRef.current = player;

    return () => {
      playerRef.current = null;
      player.release();
    };
  }, [soundName]);

  return useCallback(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    try {
      player.seekTo(0);
      player.play();
    } catch (error) {
      console.warn('Unable to play notification sound', error);
    }
  }, []);
};
