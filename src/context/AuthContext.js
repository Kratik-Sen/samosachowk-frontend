import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const defaultApiUrl = 'https://samosachowk-backend.vercel.app/api';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || defaultApiUrl;

const AuthContext = createContext();

const getApiErrorMessage = (error, fallback) => {
  const data = error.response?.data;

  if (data?.message) {
    return data.message;
  }

  if (typeof data === 'string') {
    const text = data.trim();

    if (text && !text.startsWith('<')) {
      return text;
    }
  }

  if (error.request && !error.response) {
    return `Could not reach the server at ${API_URL}. Check your internet connection and backend URL.`;
  }

  if (error.response?.status >= 500) {
    return 'Server error while contacting the backend. Try again, and check the backend logs if it continues.';
  }

  return error.message || fallback;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved token on app start
    const checkLogin = async () => {
      try {
        const userInfo = await AsyncStorage.getItem('userInfo');
        if (userInfo) {
          const parsedUser = JSON.parse(userInfo);
          setUser(parsedUser);
          axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
        }
      } catch (error) {
        console.error('Failed to load user', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkLogin();
  }, []);

  const login = async (email, password, role) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password, role });
      setUser(data);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      await AsyncStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: getApiErrorMessage(error, 'Login failed'),
      };
    }
  };

  const register = async ({
    name,
    email,
    phone,
    password,
    role,
    verificationMethod,
  }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        phone,
        password,
        role,
        verificationMethod,
      });
      return { success: true, message: data.message || 'Signup request sent to admin.' };
    } catch (error) {
      return {
        success: false,
        message: getApiErrorMessage(error, 'Signup request failed'),
      };
    }
  };

  const verifyVendorOtp = async ({ email, otp }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/vendor/verify-otp`, {
        email,
        otp,
      });
      return { success: true, message: data.message || 'Vendor account verified. You can login now.' };
    } catch (error) {
      return {
        success: false,
        message: getApiErrorMessage(error, 'OTP verification failed'),
      };
    }
  };

  const resendVendorOtp = async ({ email, phone, verificationMethod }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/vendor/resend-otp`, {
        email,
        phone,
        verificationMethod,
      });
      return { success: true, message: data.message || 'OTP sent again.' };
    } catch (error) {
      return {
        success: false,
        message: getApiErrorMessage(error, 'Unable to resend OTP'),
      };
    }
  };

  const bootstrapAdmin = async ({ name, email, phone, password }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/bootstrap-admin`, {
        name,
        email,
        phone,
        password,
      });
      setUser(data);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      await AsyncStorage.setItem('userInfo', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: getApiErrorMessage(error, 'Admin setup failed'),
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userInfo');
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const updateUser = async (nextFields) => {
    if (!user) {
      return;
    }

    const nextUser = { ...user, ...nextFields };
    setUser(nextUser);

    try {
      await AsyncStorage.setItem('userInfo', JSON.stringify(nextUser));
    } catch (error) {
      console.error('Failed to save user update', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, verifyVendorOtp, resendVendorOtp, bootstrapAdmin, logout, setUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
