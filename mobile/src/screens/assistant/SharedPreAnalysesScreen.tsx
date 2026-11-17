import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { getSharedPreAnalyses, reviewSharedPreAnalysis, URGENCY_LABEL, type SharedPreAnalysis, type Urgency } from '../../services/chatbot';
import { useAuthStore } from '../../store/useAuthStore';

const URGENCY_COLOR: Record<Urgency, string> = { LOW: colors.green, MEDIUM: colors.star, HIGH: colors.danger };

/**
 * File des pré-analyses IA partagées par des éleveurs (demande client) :
 * le vétérinaire valide, rejette, ou ajoute une note — sans passer par un
 * rendez-vous formel.
 */
export default function SharedPreAnalysesScreen() {
  const token = useAuthStore((s) => s.token);
  const [items, setItems] = useState<SharedPreAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getSharedPreAnalyses(token).then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  };

  useEffect(load, [token]);

  const review = async (id: string, decision: 'VALIDATED' | 'REJECTED') => {
    const note = decision === 'VALIDATED'
      ? 'Confirme cette orientation.'
      : 'Nécessite un examen plus approfondi — merci de prendre rendez-vous.';
    setBusyId(id);
    try {
      await reviewSharedPreAnalysis(id, decision, note, token);
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen scroll>
      <TopBar title="Pré-analyses partagées" />

      {loading ? (
        <Text style={styles.muted}>Chargement…</Text>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="share-social-outline" size={32} color={colors.greenSoft} />
          <Text style={styles.emptyText}>Aucune pré-analyse partagée pour l'instant.</Text>
        </View>
      ) : (
        items.map((it) => (
          <View key={it.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.eleveurName}>{it.eleveurName}</Text>
              <View style={[styles.badge, { backgroundColor: URGENCY_COLOR[it.urgency] }]}>
                <Text style={styles.badgeText}>Urgence {URGENCY_LABEL[it.urgency]}</Text>
              </View>
            </View>
            {it.species ? <Text style={styles.species}>{it.species}</Text> : null}
            <Text style={styles.symptoms}>{it.symptoms}</Text>
            <Text style={styles.conditions}>{it.suspectedConditions.join(', ')}</Text>
            <Text style={styles.orientation}>{it.orientation}</Text>

            {it.vetReviewStatus === 'PENDING' ? (
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionBtn, styles.validateBtn]}
                  disabled={busyId === it.id}
                  onPress={() => review(it.id, 'VALIDATED')}
                >
                  <Text style={styles.validateText}>Valider</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.rejectBtn]}
                  disabled={busyId === it.id}
                  onPress={() => review(it.id, 'REJECTED')}
                >
                  <Text style={styles.rejectText}>Rejeter</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.decidedBox}>
                <Text style={styles.decidedText}>
                  {it.vetReviewStatus === 'VALIDATED' ? '✓ Validée' : '✕ Rejetée'}
                  {it.vetReviewNote ? ` — ${it.vetReviewNote}` : ''}
                </Text>
              </View>
            )}
          </View>
        ))
      )}
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxxl },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.soft },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  eleveurName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.white },
  species: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.greenDark, marginBottom: 2 },
  symptoms: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, marginBottom: 4 },
  conditions: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.brown, marginBottom: 4 },
  orientation: { fontFamily: fonts.body, fontSize: 12, color: colors.grey },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.md },
  validateBtn: { backgroundColor: colors.green },
  validateText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.white },
  rejectBtn: { borderWidth: 1, borderColor: colors.danger },
  rejectText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.danger },
  decidedBox: { marginTop: spacing.md, padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.greenPale },
  decidedText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.greenDark },
});
