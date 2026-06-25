import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { colors, fonts, radii, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Rt = RouteProp<RootStackParamList, 'Chat'>;

interface Msg {
  id: string;
  text: string;
  mine: boolean;
  time: string;
}

const INITIAL: Msg[] = [
  { id: '1', text: "Bonjour docteur, mon veau a de la fièvre depuis 2 jours.", mine: true, time: '09:00' },
  { id: '2', text: 'Bonjour. A-t-il perdu l\'appétit ? Des lésions sur la bouche ?', mine: false, time: '09:05' },
  { id: '3', text: 'Oui, il bave et ne mange plus.', mine: true, time: '09:08' },
  { id: '4', text: "Isolez-le immédiatement. Cela peut être contagieux. Envoyez une photo de la bouche.", mine: false, time: '09:10' },
];

export default function ChatScreen() {
  const nav = useNavigation<any>();
  const { name } = useRoute<Rt>().params;
  const [messages, setMessages] = useState<Msg[]>(INITIAL);
  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { id: Date.now().toString(), text: text.trim(), mine: true, time: '09:12' },
    ]);
    setText('');
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
        data={messages}
        keyExtractor={(m) => m.id}
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
