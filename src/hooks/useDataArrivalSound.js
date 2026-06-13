import { useEffect, useRef } from 'react';
import { useNotificationSound } from './useNotificationSound';

const defaultGetKey = (item) => item?._id || item?.id;
const defaultShouldWatch = () => true;

export const useDataArrivalSound = ({
  items = [],
  isLoading = false,
  sound = 'dot',
  enabled = true,
  getKey = defaultGetKey,
  shouldWatch = defaultShouldWatch,
}) => {
  const playSound = useNotificationSound(sound);
  const knownKeysRef = useRef(new Set());
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || isLoading) {
      return;
    }

    const nextKeys = new Set(
      (items || [])
        .filter((item) => shouldWatch(item))
        .map((item) => getKey(item))
        .filter(Boolean)
        .map(String)
    );

    if (!hasLoadedRef.current) {
      knownKeysRef.current = nextKeys;
      hasLoadedRef.current = true;
      return;
    }

    const hasNewArrival = Array.from(nextKeys).some((key) => !knownKeysRef.current.has(key));
    knownKeysRef.current = nextKeys;

    if (hasNewArrival) {
      playSound();
    }
  }, [enabled, getKey, isLoading, items, playSound, shouldWatch]);
};
