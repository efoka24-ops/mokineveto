import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { colors, fonts, radii, spacing } from '../../theme';
import { createConversation, getConversation, sendMessageRest } from '../../services/api';
import {
  joinConversation,
  sendSocketMessage,
  onNewMessage,
  getSocket,
  type SocketMessage,
} from '../../services/socket';
import { useAuthStore } from '../../store/useAuthStore';
import type { RootStackParamList } from '../../navigation/types';

type Rt = RouteProp<RootStackParamList, 'Chat'>;

interface Msg {
  id: string;
  text: string;
  mine: boolean;
  time: string;
}

export default function ChatScreen() {
  const nav = useNavigation<any>();
  const { vetId, name } = useRoute<Rt>().params;
  const myId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        // Create/find conversation with this vet
        const convoRes = await createConversation(vetId);
        const cid = convoRes.data.id;
        setConversationId(cid);

        // Load history
        const full = await getConversation(cid);
        const history = (full.data.messages || []).map((m) => ({
          id: m.id,
          text: m.text,
          mine: m.senderId === myId,
          time: fmtTime(m.createdAt),
        }));
        setMessages(history);

        // Join socket room + listen
        joinConversation(cid);
        cleanup = onNewMessage((msg: SocketMessage) => {
          if (msg.conversationId !== cid) return;
          setMessages((prev) => {
            if (prev.some((p) => p.id === msg.id)) return prev;
            return [
              ...prev,
              { id: msg.id, text: msg.text, mine: msg.senderId === myId, time: fmtTime(msg.timestamp) },
            ];
          });
        });
      } catch (_err) {
        console.warn('[ChatScreen] Failed to initialize conversation');
      }
    };

    init();
    return () => cleanup?.();
  }, [vetId, myId]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId) return;
    setText('');

    const socket = getSocket();
    if (socket?.connected) {
      sendSocketMessage(conversationId, trimmed);
    } else {
      // REST fallback (no real-time echo, so append locally)
      try {
        const res = await sendMessageRest(conversationId, trimmed);
        setMessages((prev) => [
          ...prev,
          { id: res.data.id, text: trimmed, mine: true, time: fmtTime(res.data.createdAt) },
        ]);
      } catch (_err) {
        console.warn('[ChatScreen] Failed to send message');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
        <View style={styles.headerActions}>
          <Ionicons name="call-outline" size={20} color={colors.white} />
          <Ionicons name="videocam-outline" size={22} color={colors.white} />
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.mine ? styles.rowMine : styles.rowTheirs]}>
            <View style={[styles.bubble, item.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.bubbleText, item.mine && { color: colors.ink }]}>{item.text}</Text>
            </View>
          </View>
        )}
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <Ionicons name="attach" size={22} color={colors.green} />
        <TextInput
          placeholder="écrire ici…"
          placeholderTextColor={colors.grey}
          style={styles.input}
          value={text}
          onChangeText={setText}
        />
        <Pressable style={styles.send} onPress={send}>
          <Ionicons name="send" size={18} color={colors.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.green, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerName: { flex: 1, fontFamily: fonts.displayBold, fontSize: 18, color: colors.white },
  headerActions: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: radii.lg, padding: spacing.md },
  bubbleMine: { backgroundColor: colors.bluePale, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bgBlue, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.greenPale },
  input: { flex: 1, backgroundColor: colors.white, borderRadius: radii.pill, paddingHorizontal: spacing.lg, height: 44, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
});
