import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config/api';
import { useAuth } from './AuthContext';
const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (!token || !user?.id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(API_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('joinUser', user.id);

    return () => socket.disconnect();
  }, [token, user?.id]);

  const joinOrder = (orderId) => socketRef.current?.emit('joinOrder', orderId);

  const onOrderUpdate = (callback) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on('orderStatusUpdate', callback);
    return () => s.off('orderStatusUpdate', callback);
  };

  const onNotification = (callback) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on('notification', callback);
    return () => s.off('notification', callback);
  };

  return (
    <SocketContext.Provider value={{ joinOrder, onOrderUpdate, onNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
