import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { getChatbotHistory, shareWithVet, URGENCY_LABEL, type ChatbotHistoryItem, type Urgency } from '../../services/chatbot';
import { listAppointments } from '../../services/api';

const URGENCY_COLOR: Record<Urgency, string> = { LOW: colors.green, MEDIUM: colors.star, HIGH: colors.danger };

/**
 * Historique des échanges avec l'assistant de pré-analyse.
 *
 * Chaque appel à l'assistant est une analyse ponctuelle, pas un dialogue à
 * plusieurs tours : cet écran liste donc ces analyses passées plutôt que de
 * simuler un fil de discussion qui n'a jamais existé.
 */
export default function ChatbotHistoryScreen() {
  const token = useAuthStore((s) => s.token);
  const [items, setItems] = useState<ChatbotHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myVets, setMyVets] = useState<{ id: string; name: string }[]>([]);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getChatbotHistory(token).then((rows) => {
      setItems(rows);
      setLoading(false);
    });
    listAppointments()
      .then((res) => {
        const seen = new Map<string, string>();
        (res.data || []).forEach((a) => {
          if (a.vetProfile?.id && a.vetProfile.user?.name) seen.set(a.vetProfile.id, a.vetProfile.user.name);
        });
        setMyVets(Array.from(seen, ([id, name]) => ({ id, name })));
      })
      .catch(() => {});
  }, [token]);

  const share = async (historyId: string, vetProfileId: string) => {
    setSharingId(historyId);
    try {
      const ok = await shareWithVet(historyId, vetProfileId, token);
      if (ok) setSharedIds((prev) => new Set(prev).add(historyId));
    } finally {
      setSharingId(null);
    }
  };

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Historique de l'assistant" />
      {loading ? (
        <Text style={styles.empty}>Chargement…</Text>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="chatbubbles-outline" size={32} color={colors.greenSoft} />
          <Text style={styles.emptyTitle}>Aucune pré-analyse pour l'instant</Text>
          <Text style={styles.empty}>Vos échanges avec l'assistant apparaîtront ici.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {items.map((it) => (
            <View key={it.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.date}>
                  {new Date(it.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={[styles.badge, { backgroundColor: URGENCY_COLOR[it.urgency] }]}>
                  <Text style={styles.badgeText}>Urgence {URGENCY_LABEL[it.urgency]}</Text>
                </View>
              </View>
              {it.species ? <Text style={styles.species}>{it.species}</Text> : null}
              <Text style={styles.symptoms} numberOfLines={2}>{it.symptoms}</Text>
              <Text style={styles.conditions}>{it.suspectedConditions.join(', ')}</Text>

              {it.vetReviewStatus ? (
                <Text style={styles.shareStatus}>
                  {it.vetReviewStatus === 'PENDING' ? '⏳ Partagé, en attente de votre vétérinaire' : it.vetReviewStatus === 'VALIDATED' ? '✓ Validé par votre vétérinaire' : '✕ Examiné par votre vétérinaire'}
                  {it.vetReviewNote ? ` — ${it.vetReviewNote}` : ''}
                </Text>
              ) : sharedIds.has(it.id) ? (
                <Text style={styles.shareStatus}>⏳ Partagé</Text>
              ) : myVets.length > 0 ? (
                <View style={styles.shareRow}>
                  {myVets.map((v) => (
                    <Pressable
                      key={v.id}
                      disabled={sharingId === it.id}
                      style={styles.shareBtn}
                      onPress={() => share(it.id, v.id)}
                    >
                      <Ionicons name="share-social-outline" size={13} color={colors.green} />
                      <Text style={styles.shareBtnText}>Partager avec {v.name}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxxl },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brown },
  card: {
    backgroundColor: colors.bgBlue,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.soft,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.grey },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.white },
  species: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.greenDark, marginBottom: 2 },
  symptoms: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, marginBottom: 4 },
  conditions: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.brown },
  shareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenPale, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  shareBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.greenDark },
  shareStatus: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.greenDark, marginTop: spacing.sm },
});
