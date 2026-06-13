import { useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeEvent } from '../context/RealtimeContext';
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
  const actionSet = useMemo(() => new Set(actions), [actionsKey]);

  const handleResourceChanged = useCallback(
    (payload = {}) => {
      const audienceUsers = (payload.audienceUsers || payload.users || []).map(String);
      const audienceRoles = (payload.audienceRoles || payload.roles || []).map(String);
      const hasAudience = audienceUsers.length || audienceRoles.length;
      const userId = String(user?._id || user?.id || '');
      const userRole = String(user?.role || '');

      if (hasAudience && !audienceUsers.includes(userId) && !audienceRoles.includes(userRole)) {
        return;
      }

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
    },
    [actionSet, entity, playSound, user?._id, user?.id, user?.role]
  );

  useRealtimeEvent('resource:changed', handleResourceChanged, Boolean(enabled && actions.length));
};

export const useSocketEventSound = ({ eventName, sound = 'dot', enabled = true, getEventKey }) => {
  const playSound = useNotificationSound(sound);
  const seenEventsRef = useRef(new Set());

  const handleSocketEvent = useCallback(
    (payload = {}) => {
      const eventKey = getEventKey
        ? getEventKey(payload)
        : `${eventName}:${payload.deliveryId || payload.orderId || payload.entityId || 'event'}:${payload.updatedAt || payload.status || ''}`;

      if (rememberEvent(seenEventsRef.current, eventKey)) {
        playSound();
      }
    },
    [eventName, getEventKey, playSound]
  );

  useRealtimeEvent(eventName, handleSocketEvent, Boolean(enabled && eventName));
};
