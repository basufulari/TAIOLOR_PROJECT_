import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
console.log('[AI Tailor] API:', API_URL);

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      error.message = 'Session expired — please login again';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  register: (data) => api.post('/auth/register', data, { timeout: 15000 }),
  customerRegister: (data) => api.post('/auth/customer/register', data, { timeout: 15000 }),
  login: (data) => api.post('/auth/login', data, { timeout: 15000 }),
  me: () => api.get('/auth/me', { timeout: 10000 }),
  status: () => api.get('/auth/status', { timeout: 8000 }),
};

export const measurements = {
  detect: (formData) =>
    api.post('/measurements/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  list: () => api.get('/measurements'),
  primary: (customerId) =>
    api.get('/measurements/primary', { params: customerId ? { customerId } : {} }),
};

export const customers = {
  list: () => api.get('/customers'),
  records: () => api.get('/customers/records'),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
};

export const designs = {
  list: (category) => api.get('/designs', { params: { category } }),
  get: (id) => api.get(`/designs/${id}`),
  create: (formData) =>
    api.post('/designs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
};

export const canvas = {
  analyze: (body) => api.post('/canvas/analyze', body, { timeout: 90000 }),
  save: (body) => api.post('/canvas/save', body, { timeout: 90000 }),
  mine: () => api.get('/canvas/mine'),
};

export const orders = {
  create: (formData) =>
    api.post('/orders', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  my: () => api.get('/orders/my'),
  customerMy: () => api.get('/orders/customer/my'),
  customerGet: (id) => api.get(`/orders/customer/${id}`),
  get: (id) => api.get(`/orders/${id}`),
  dashboard: () => api.get('/orders/dashboard'),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
};

export const tryon = {
  generate: (formData) =>
    api.post('/tryon', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
};

export const payments = {
  razorpayCreatePaymentLink: (body) => api.post('/payments/razorpay/payment-link', body, { timeout: 20000 }),
  razorpayPaymentLinkStatus: (orderId) =>
    api.get(`/payments/razorpay/payment-link/${orderId}/status`, { timeout: 20000 }),
};

export const admin = {
  dashboard: () => api.get('/admin/dashboard'),
  data: () => api.get('/admin/data'),
};

export const notifications = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export default api;
