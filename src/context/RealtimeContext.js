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
  const { user } = useAuth();
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
    const handleAppStateChange = (nextState) => {
      if (nextState === 'active' && !nextSocket.connected) {
        nextSocket.connect();
      }
    };

    nextSocket.on('connect', handleConnect);
    nextSocket.on('disconnect', handleDisconnect);
    nextSocket.on('connect_error', handleDisconnect);

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription.remove();
      nextSocket.off('connect', handleConnect);
      nextSocket.off('disconnect', handleDisconnect);
      nextSocket.off('connect_error', handleDisconnect);
      nextSocket.disconnect();

      if (socketRef.current === nextSocket) {
        socketRef.current = null;
      }
    };
  }, [user?.token]);

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
