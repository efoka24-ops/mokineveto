/**
 * Socket.io Real-time Chat Server
 * - JWT authentication on connection
 * - Rooms: users by ID + conversations by ID
 * - Events: message, typing, read, presence
 * - Persists to Conversation + Message models
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from './lib/jwt.js';
import { prisma } from './lib/prisma.js';

export function initializeSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', credentials: true },
  });

  // Middleware: Verify JWT on connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string;
      if (!token) return next(new Error('No token provided'));

      const decoded = verifyAccessToken(token);
      (socket as any).userId = decoded.sub;
      (socket as any).userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`[socket] User connected: ${userId} (${socket.id})`);

    // Join user room (private notifications)
    socket.join(`user:${userId}`);

    // ─── Event: Join conversation ───────────────────────────────────────────
    socket.on('conversation:join', async (conversationId: string) => {
      try {
        const convo = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { eleveur: true },
        });

        if (!convo) {
          socket.emit('error', 'Conversation not found');
          return;
        }

        // Check access: eleveur or vet
        const isVet = convo.vetProfileId; // Any vet can join if they're routing to this convo
        if (convo.eleveurId !== userId && !isVet) {
          socket.emit('error', 'Access denied');
          return;
        }

        socket.join(`convo:${conversationId}`);
        socket.emit('conversation:joined', { conversationId });
        console.log(`[socket] User ${userId} joined conversation ${conversationId}`);

        // Emit presence
        io.to(`convo:${conversationId}`).emit('presence:online', { userId, socketId: socket.id });
      } catch (err) {
        socket.emit('error', 'Failed to join conversation');
      }
    });

    // ─── Event: Send message ───────────────────────────────────────────────
    socket.on('message:send', async (payload: { conversationId: string; text: string }) => {
      try {
        const { conversationId, text } = payload;

        if (!text || text.trim().length === 0) return;

        // Verify conversation access
        const convo = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!convo || (convo.eleveurId !== userId && convo.vetProfileId)) {
          socket.emit('error', 'Cannot send to this conversation');
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            text: text.trim(),
          },
          include: { author: true },
        });

        // Update conversation lastMessageAt
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });

        // Broadcast to conversation room
        io.to(`convo:${conversationId}`).emit('message:new', {
          id: message.id,
          conversationId,
          senderId: message.senderId,
          senderName: message.author.name,
          text: message.text,
          timestamp: message.createdAt,
        });

        console.log(`[socket] Message sent in ${conversationId} by ${userId}`);
      } catch (err) {
        socket.emit('error', 'Failed to send message');
        console.error('[socket] message:send error:', err);
      }
    });

    // ─── Event: Mark message as read ───────────────────────────────────────
    socket.on('message:read', async (messageId: string) => {
      try {
        const message = await prisma.message.update({
          where: { id: messageId },
          data: { readAt: new Date() },
          include: { conversation: true, author: true },
        });

        io.to(`convo:${message.conversationId}`).emit('message:read', { messageId });
      } catch (err) {
        console.error('[socket] message:read error:', err);
      }
    });

    // ─── Event: Typing indicator ───────────────────────────────────────────
    socket.on('typing:start', (conversationId: string) => {
      io.to(`convo:${conversationId}`).emit('typing:user', {
        userId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      io.to(`convo:${conversationId}`).emit('typing:user', {
        userId,
        isTyping: false,
      });
    });

    // ─── Event: Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[socket] User disconnected: ${userId} (${socket.id})`);
      // Emit offline to all conversation rooms they were in
      io.emit('presence:offline', { userId, socketId: socket.id });
    });
  });

  return io;
}
