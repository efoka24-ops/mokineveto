/**
 * Chat REST API (fallback for non-realtime operations)
 * - GET /chat/conversations - list user's conversations
 * - GET /chat/conversations/:id - get conversation detail + messages
 * - POST /chat/conversations - create or start conversation
 * - POST /chat/conversations/:id/messages - add message (if socket.io unavailable)
 * - GET /chat/notifications - list unread message notifications
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const chatRouter = Router();

// ─── GET /chat/conversations - List user's conversations ──────────────────────
chatRouter.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Find conversations where user is eleveur
    const conversations = await prisma.conversation.findMany({
      where: { eleveurId: userId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── GET /chat/conversations/:id - Get conversation detail + messages ─────────
chatRouter.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        eleveur: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: true },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Check access
    if (conversation.eleveurId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: conversation });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── POST /chat/conversations - Create conversation ──────────────────────────
chatRouter.post('/conversations', requireAuth, async (req, res) => {
  const { vetProfileId } = req.body;

  try {
    if (!vetProfileId) {
      return res.status(400).json({ success: false, error: 'vetProfileId required' });
    }

    // Check vet exists
    const vet = await prisma.vetProfile.findUnique({
      where: { id: vetProfileId },
    });

    if (!vet) {
      return res.status(404).json({ success: false, error: 'Vet not found' });
    }

    // Find or create conversation
    const conversation = await prisma.conversation.upsert({
      where: {
        eleveurId_vetProfileId: {
          eleveurId: req.user!.id,
          vetProfileId,
        },
      },
      update: {},
      create: {
        eleveurId: req.user!.id,
        vetProfileId,
      },
    });

    res.json({ success: true, data: conversation });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── POST /chat/conversations/:id/messages - Add message (REST fallback) ─────
chatRouter.post('/conversations/:id/messages', requireAuth, async (req, res) => {
  const { text } = req.body;

  try {
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text required' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (conversation.eleveurId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        senderId: req.user!.id,
        text: text.trim(),
      },
      include: { author: true },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { lastMessageAt: new Date() },
    });

    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});

// ─── GET /chat/notifications - List unread messages ─────────────────────────
chatRouter.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Find conversations with unread messages
    const conversations = await prisma.conversation.findMany({
      where: { eleveurId: userId },
      include: {
        messages: {
          where: { readAt: null, senderId: { not: userId } },
        },
      },
    });

    const unreadCount = conversations.reduce((sum, c) => sum + c.messages.length, 0);

    res.json({
      success: true,
      data: {
        unreadCount,
        conversations: conversations.filter((c) => c.messages.length > 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
});
