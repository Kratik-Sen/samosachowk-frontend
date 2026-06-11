import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { createTrackingSocket } from '../utils/socket';
import { useNotificationSound } from './useNotificationSound';

const rememberEvent = (seenEvents, eventKey) => {
  if (!eventKey) {
    return true;
  }

  if (seenEvents.has(eventKey)) {
    return false;
  }

  seenEvents.add(eventKey);

  if (seenEvents.size > 120) {
    seenEvents.delete(seenEvents.values().next().value);
  }

  return true;
};

export const useRealtimeActionSound = ({ actions = [], entity = 'order', sound = 'dot', enabled = true }) => {
  const { user } = useAuth();
  const playSound = useNotificationSound(sound);
  const seenEventsRef = useRef(new Set());
  const actionsKey = actions.join('|');

  useEffect(() => {
    if (!enabled || !user?.token || !actions.length) {
      return undefined;
    }

    const socket = createTrackingSocket(user.token);
    const actionSet = new Set(actions);

    const handleResourceChanged = (payload = {}) => {
      if (!actionSet.has(payload.action)) {
        return;
      }

      if (entity && payload.entity !== entity) {
        return;
      }

      const eventKey = `${payload.action}:${payload.entity}:${payload.entityId}:${payload.updatedAt}`;

      if (rememberEvent(seenEventsRef.current, eventKey)) {
        playSound();
      }
    };

    socket.on('resource:changed', handleResourceChanged);

    return () => {
      socket.disconnect();
    };
  }, [enabled, user?.token, actionsKey, entity, playSound]);
};

export const useSocketEventSound = ({ eventName, sound = 'dot', enabled = true, getEventKey }) => {
  const { user } = useAuth();
  const playSound = useNotificationSound(sound);
  const seenEventsRef = useRef(new Set());

  useEffect(() => {
    if (!enabled || !user?.token || !eventName) {
      return undefined;
    }

    const socket = createTrackingSocket(user.token);

    const handleSocketEvent = (payload = {}) => {
      const eventKey = getEventKey
        ? getEventKey(payload)
        : `${eventName}:${payload.deliveryId || payload.orderId || payload.entityId || payload.updatedAt}`;

      if (rememberEvent(seenEventsRef.current, eventKey)) {
        playSound();
      }
    };

    socket.on(eventName, handleSocketEvent);

    return () => {
      socket.disconnect();
    };
  }, [enabled, user?.token, eventName, playSound, getEventKey]);
};
