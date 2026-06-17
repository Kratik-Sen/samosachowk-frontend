import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import axios from 'axios';
import { API_URL, useAuth } from '../context/AuthContext';
import { useRealtime, useRealtimeEvent } from '../context/RealtimeContext';

const pathDomains = [
  { test: (path) => path.startsWith('/admin/overview'), domains: ['admin', 'orders', 'products', 'users', 'vendors', 'deliveries', 'wallet', 'production', 'rewards'] },
  { test: (path) => path.startsWith('/admin/rewards'), domains: ['admin', 'wallet', 'vendors', 'rewards'] },
  { test: (path) => path.startsWith('/admin/users'), domains: ['admin', 'users', 'vendors', 'deliveries'] },
  { test: (path) => path.startsWith('/admin/outlets'), domains: ['admin', 'vendors', 'users'] },
  { test: (path) => path.startsWith('/sales/dashboard'), domains: ['sales', 'orders', 'vendors', 'users', 'deliveries'] },
  { test: (path) => path.startsWith('/sales/vendors'), domains: ['sales', 'vendors', 'users'] },
  { test: (path) => path.startsWith('/sales/delivery-boys'), domains: ['sales', 'users', 'deliveries'] },
  { test: (path) => path.startsWith('/production/orders'), domains: ['production', 'orders'] },
  { test: (path) => path.startsWith('/production/dashboard'), domains: ['production', 'products'] },
  { test: (path) => path.startsWith('/delivery/dashboard'), domains: ['deliveries', 'orders'] },
  { test: (path) => path.startsWith('/delivery/availability'), domains: ['deliveries', 'users'] },
  { test: (path) => path.startsWith('/vendors/dashboard'), domains: ['vendors', 'orders', 'wallet'] },
  { test: (path) => path.startsWith('/vendors/orders'), domains: ['vendors', 'orders', 'deliveries'] },
  { test: (path) => path.startsWith('/vendors/profile'), domains: ['vendors', 'users'] },
  { test: (path) => path.startsWith('/wallet'), domains: ['wallet', 'rewards'] },
  { test: (path) => path.startsWith('/products'), domains: ['products'] },
  { test: (path) => path.startsWith('/orders'), domains: ['orders', 'deliveries'] },
];

const getLiveDomains = (path, options) => {
  if (options.live === false || !path) {
    return [];
  }

  if (Array.isArray(options.liveDomains)) {
    return options.liveDomains;
  }

  return pathDomains.find((entry) => entry.test(path))?.domains || [];
};

export const useApiResource = (path, initialValue = null, options = {}) => {
  const { user } = useAuth();
  const { isConnected } = useRealtime();
  const [data, setData] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const liveDomains = getLiveDomains(path, options);
  const liveDomainsKey = liveDomains.join('|');
  const realtimeEnabled = Boolean(user?.token && liveDomains.length && options.enabled !== false);
  const liveFallbackIntervalMs =
    realtimeEnabled && options.liveFallbackIntervalMs !== false
      ? Number(options.liveFallbackIntervalMs || 8000)
      : 0;
  const refreshTimerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!path || options.enabled === false) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}${path}`);
      setData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load data');
    } finally {
      setIsLoading(false);
    }
  }, [path, options.enabled]);

  const refreshQuietly = useCallback(async () => {
    if (!path || options.enabled === false) {
      return;
    }

    try {
      setError('');
      const response = await axios.get(`${API_URL}${path}`);
      setData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load data');
    }
  }, [path, options.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scheduleRefresh = useCallback(
    (payload = {}) => {
      const changedDomains = payload.domains || [];
      const shouldRefresh =
        !changedDomains.length || liveDomains.some((domain) => changedDomains.includes(domain));

      if (!shouldRefresh) {
        return;
      }

      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshQuietly();
      }, 250);
    },
    [refreshQuietly, liveDomainsKey]
  );

  useRealtimeEvent(
    'resource:changed',
    scheduleRefresh,
    realtimeEnabled
  );

  useRealtimeEvent('connect', scheduleRefresh, realtimeEnabled);

  useEffect(() => {
    if (realtimeEnabled && isConnected) {
      scheduleRefresh();
    }
  }, [isConnected, realtimeEnabled, scheduleRefresh]);

  useEffect(() => {
    if (!realtimeEnabled) {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        scheduleRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [realtimeEnabled, scheduleRefresh]);

  useEffect(() => {
    if (!liveFallbackIntervalMs) {
      return undefined;
    }

    const interval = setInterval(() => {
      refreshQuietly();
    }, liveFallbackIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [liveFallbackIntervalMs, refreshQuietly]);

  useEffect(
    () => () => {
      clearTimeout(refreshTimerRef.current);
    },
    []
  );

  return { data, setData, isLoading, error, refetch: fetchData };
};
