import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL_DEV
  : import.meta.env.VITE_API_URL_PRO;

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
