import { useEffect, useState } from 'react';
import socket from '../services/socket';

export function useSocket() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket, connected };
}

export function useSocketEvent(event, callback) {
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, [event, callback]);
}
