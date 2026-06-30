import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './config';

let socket: Socket | null = null;

export interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => console.log('[socket] connected'));
  socket.on('connect_error', (err) => console.warn('[socket] connect error:', err.message));

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinConversation(conversationId: string): void {
  socket?.emit('conversation:join', conversationId);
}

export function sendSocketMessage(conversationId: string, text: string): void {
  socket?.emit('message:send', { conversationId, text });
}

export function onNewMessage(cb: (msg: SocketMessage) => void): () => void {
  socket?.on('message:new', cb);
  return () => {
    socket?.off('message:new', cb);
  };
}
