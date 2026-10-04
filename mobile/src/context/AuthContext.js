import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth as authApi } from '../services/api';
import { API_URL } from '../config/api';

const AuthContext = createContext(null);

function apiErrorMessage(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.response?.data?.errors?.[0]?.msg) return err.response.data.errors[0].msg;
  if (err.message === 'Network Error' || err.code === 'ECONNABORTED') {
    return `Cannot reach server at ${API_URL}. Run backend: cd backend && npm start`;
  }
  return err.message || 'Request failed';
}

function normalizeUser(u) {
  return { ...u, id: String(u.id || u._id) };
}

function ensureAppUser(u, expectedRole) {
  if (!u?.role) throw new Error('Invalid account.');
  if (expectedRole === 'customer' && u.role !== 'customer') {
    throw new Error('Use customer login or register as customer.');
  }
  if (expectedRole === 'tailor' && !['tailor', 'admin'].includes(u.role)) {
    throw new Error('Use tailor login or register as tailor.');
  }
  return normalizeUser(u);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginRole, setLoginRole] = useState('tailor');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('token');
        const storedRole = await AsyncStorage.getItem('loginRole');
        if (storedRole) setLoginRole(storedRole);
        if (!stored) {
          setLoading(false);
          return;
        }
        setToken(stored);
        const { data } = await authApi.me();
        const role = data.user?.role === 'customer' ? 'customer' : 'tailor';
        setUser(ensureAppUser(data.user, role));
        setLoginRole(role);
      } catch {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('loginRole');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistSession = async (data, expectedRole) => {
    if (!data?.token || !data?.user) throw new Error('Invalid server response');
    const u = ensureAppUser(data.user, expectedRole);
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('loginRole', expectedRole);
    setLoginRole(expectedRole);
    setToken(data.token);
    setUser(u);
    return { user: u, linkedOrders: data.linkedOrders, message: data.message };
  };

  const login = async (email, password, role = loginRole) => {
    const { data } = await authApi.login({
      email: email.trim().toLowerCase(),
      password,
      role: role === 'customer' ? 'customer' : 'tailor',
    });
    return persistSession(data, role === 'customer' ? 'customer' : 'tailor');
  };

  const register = async (payload) => {
    const { data } = await authApi.register({
      ...payload,
      email: payload.email.trim().toLowerCase(),
    });
    return persistSession(data, 'tailor');
  };

  const registerCustomer = async (payload) => {
    const { data } = await authApi.customerRegister({
      ...payload,
      email: payload.email.trim().toLowerCase(),
    });
    return persistSession(data, 'customer');
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('loginRole');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        registerCustomer,
        logout,
        apiErrorMessage,
        loginRole,
        setLoginRole,
        isPreview: false,
        isAdmin: user?.role === 'admin',
        isTailor: user?.role === 'tailor',
        isCustomer: user?.role === 'customer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
