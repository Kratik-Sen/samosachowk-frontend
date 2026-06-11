import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL, useAuth } from '../context/AuthContext';
import { createTrackingSocket } from '../utils/socket';

const pathDomains = [
  { test: (path) => path.startsWith('/admin/overview'), domains: ['admin', 'orders', 'products', 'users', 'vendors', 'deliveries', 'wallet', 'production'] },
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
  { test: (path) => path.startsWith('/wallet'), domains: ['wallet'] },
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
  const [data, setData] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const liveDomains = getLiveDomains(path, options);

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

  useEffect(() => {
    if (!user?.token || !liveDomains.length || options.enabled === false) {
      return undefined;
    }

    const socket = createTrackingSocket(user.token);
    let refreshTimer;

    const scheduleRefresh = (payload = {}) => {
      const changedDomains = payload.domains || [];
      const shouldRefresh =
        !changedDomains.length || liveDomains.some((domain) => changedDomains.includes(domain));

      if (!shouldRefresh) {
        return;
      }

      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshQuietly();
      }, 250);
    };

    socket.on('resource:changed', scheduleRefresh);

    return () => {
      clearTimeout(refreshTimer);
      socket.disconnect();
    };
  }, [user?.token, refreshQuietly, options.enabled, liveDomains.join('|')]);

  return { data, setData, isLoading, error, refetch: fetchData };
};
