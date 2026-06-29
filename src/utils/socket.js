import { io } from 'socket.io-client';
import { API_URL } from '../context/AuthContext';

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

export const SOCKET_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_SOCKET_URL || API_URL.replace(/\/api\/?$/, '')
);

export const SOCKET_PATH = process.env.EXPO_PUBLIC_SOCKET_PATH || '/socket.io';

export const createTrackingSocket = (token) => {
  if (!token) {
    return null;
  }

  return io(SOCKET_URL, {
    auth: { token },
    path: SOCKET_PATH,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    rememberUpgrade: true,
  });
};

export const createSignupSocket = () =>
  io(SOCKET_URL, {
    path: SOCKET_PATH,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    rememberUpgrade: true,
  });
