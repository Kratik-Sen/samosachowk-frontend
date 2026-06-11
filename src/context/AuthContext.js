import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const defaultApiUrl = 'https://samosachowk-backend.vercel.app/api';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || defaultApiUrl;

const AuthContext = createContext();

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
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async ({
    name,
    email,
    phone,
    password,
    role,
  }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        phone,
        password,
        role,
      });
      return { success: true, message: data.message || 'Signup request sent to admin.' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Signup request failed',
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
        message: error.response?.data?.message || 'Admin setup failed',
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

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, bootstrapAdmin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
