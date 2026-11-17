import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { listConversations, type ApiConversation } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Liste des conversations réelles (SFD §4.8) — un éleveur y voit les
 * vétérinaires avec qui il échange, un vétérinaire y voit ses éleveurs.
 * Remplace un précédent écran qui listait en réalité l'annuaire des
 * vétérinaires avec des aperçus de message inventés.
 */
export default function MessagesScreen() {
  const nav = useNavigation<Nav>();
  const role = useAuthStore((s) => s.user?.role);
  const isVet = role === 'VETERINAIRE';
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    listConversations()
      .then(({ data }) => setConversations(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);
  useFocusEffect(load);

  const fmtTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Messages</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!loading && conversations.length === 0 && (
          <Text style={styles.empty}>Aucune conversation pour l'instant.</Text>
        )}
        {conversations.map((c) => {
          const other = isVet ? c.eleveur : c.vet;
          if (!other) return null;
          return (
            <Pressable
              key={c.id}
              style={styles.row}
              onPress={() => nav.navigate('Chat', { conversationId: c.id, name: other.name })}
            >
              <Image source={{ uri: other.avatarUrl || `https://i.pravatar.cc/100?u=${other.id}` }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{other.name}</Text>
                <Text style={styles.preview} numberOfLines={1}>{c.lastMessage || 'Aucun message pour le moment'}</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.time}>{fmtTime(c.lastMessageAt)}</Text>
                {!!c.unreadCount && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{c.unreadCount}</Text></View>
                )}
              </View>
            </Pressable>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgBlue },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.brown, textAlign: 'center', paddingVertical: spacing.lg },
  content: { paddingHorizontal: spacing.xl },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, textAlign: 'center', marginTop: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  preview: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.grey },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
});
