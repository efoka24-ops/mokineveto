import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './config';

/**
 * Messagerie temps réel.
 *
 * Le backend de production est en PHP sur un hébergement mutualisé, qui ne peut
 * pas maintenir de connexion persistante : il n'y a pas de serveur socket.io en
 * face. Tenter la connexion produisait une erreur visible à l'écran à chaque
 * ouverture de session.
 *
 * Le temps réel est donc désactivé par défaut et la messagerie repose sur
 * l'interrogation périodique (voir `pollMessages`). Il se réactive en
 * définissant EXPO_PUBLIC_REALTIME=on, pour un backend qui le prend en charge.
 */
const REALTIME_ENABLED = process.env.EXPO_PUBLIC_REALTIME === 'on';

let socket: Socket | null = null;

export interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export function isRealtimeEnabled(): boolean {
  return REALTIME_ENABLED;
}

export function connectSocket(token: string): Socket | null {
  if (!REALTIME_ENABLED) return null;
  if (socket?.connected) return socket;

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => console.log('[socket] connecté'));
  // Échec silencieux : l'indisponibilité du temps réel dégrade la messagerie,
  // elle ne doit pas se manifester par une erreur à l'utilisateur.
  socket.on('connect_error', (err) => console.warn('[socket] connexion impossible :', err.message));

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
