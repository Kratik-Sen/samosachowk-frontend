import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { createTrackingSocket } from '../utils/socket';

const RealtimeContext = createContext({
  socket: null,
  isConnected: false,
  emit: () => false,
});

export const RealtimeProvider = ({ children }) => {
  const { user, logout } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      setSocket(null);
      setIsConnected(false);
      return undefined;
    }

    const nextSocket = createTrackingSocket(user.token);
    socketRef.current = nextSocket;
    setSocket(nextSocket);
    setIsConnected(nextSocket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleConnectError = (error) => {
      setIsConnected(false);

      if (/account|authentication token is invalid|not active/i.test(error?.message || '')) {
        logout();
      }
    };
    const handleAccountDeleted = () => {
      logout();
    };
    const handleResourceChanged = (payload = {}) => {
      const userId = user?._id || user?.id;

      if (
        payload.action === 'deleted' &&
        payload.entity === 'user' &&
        payload.entityId === userId
      ) {
        logout();
      }
    };
    const handleAppStateChange = (nextState) => {
      if (nextState === 'active' && !nextSocket.connected) {
        nextSocket.connect();
      }
    };

    nextSocket.on('connect', handleConnect);
    nextSocket.on('disconnect', handleDisconnect);
    nextSocket.on('connect_error', handleConnectError);
    nextSocket.on('account:deleted', handleAccountDeleted);
    nextSocket.on('resource:changed', handleResourceChanged);

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription.remove();
      nextSocket.off('connect', handleConnect);
      nextSocket.off('disconnect', handleDisconnect);
      nextSocket.off('connect_error', handleConnectError);
      nextSocket.off('account:deleted', handleAccountDeleted);
      nextSocket.off('resource:changed', handleResourceChanged);
      nextSocket.disconnect();

      if (socketRef.current === nextSocket) {
        socketRef.current = null;
      }
    };
  }, [logout, user?._id, user?.id, user?.token]);

  const emit = useCallback((eventName, payload, callback) => {
    const activeSocket = socketRef.current;

    if (!activeSocket) {
      return false;
    }

    activeSocket.emit(eventName, payload, callback);
    return true;
  }, []);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      emit,
    }),
    [socket, isConnected, emit]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = () => useContext(RealtimeContext);

export const useRealtimeEvent = (eventName, handler, enabled = true) => {
  const { socket } = useRealtime();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled || !socket || !eventName) {
      return undefined;
    }

    const listener = (payload) => {
      handlerRef.current?.(payload);
    };

    socket.on(eventName, listener);

    return () => {
      socket.off(eventName, listener);
    };
  }, [enabled, socket, eventName]);
};
