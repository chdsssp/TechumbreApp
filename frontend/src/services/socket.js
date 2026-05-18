import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

const socket = io(BACKEND_URL || '/', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export default socket;
