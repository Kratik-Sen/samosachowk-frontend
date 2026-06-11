import { io } from 'socket.io-client';
import { API_URL } from '../context/AuthContext';

export const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || API_URL.replace(/\/api\/?$/, '');

export const createTrackingSocket = (token) => {
  if (!token) {
    return null;
  }

  return io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  });
};
