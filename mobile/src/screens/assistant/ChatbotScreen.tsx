import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { SYMPTOMS, analyze, URGENCY_LABEL, type PreAnalysis } from '../../services/chatbot';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const URGENCY_COLOR = { LOW: colors.green, MEDIUM: colors.star, HIGH: colors.danger } as const;

export default function ChatbotScreen() {
  const nav = useNavigation<Nav>();
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<PreAnalysis | null>(null);

  const toggle = (key: string) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Assistant de pré-analyse" />

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle" size={18} color={colors.green} />
        <Text style={styles.disclaimerText}>
          L'assistant fournit une orientation, pas un diagnostic. L'avis final revient au vétérinaire.
        </Text>
      </View>

      <Text style={styles.q}>Quels signes observez-vous chez l'animal ?</Text>
      <View style={styles.chips}>
        {SYMPTOMS.map((s) => {
          const active = selected.includes(s.key);
          return (
            <Pressable
              key={s.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(s.key)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title="Analyser les symptômes"
        onPress={() => setResult(analyze(selected))}
        disabled={selected.length === 0}
        style={{ marginTop: spacing.lg }}
      />

      {result ? (
        <View style={styles.result}>
          <View style={styles.resultHead}>
            <Text style={styles.resultTitle}>Pré-analyse</Text>
            <View style={[styles.urgency, { backgroundColor: URGENCY_COLOR[result.urgency] }]}>
              <Text style={styles.urgencyText}>Urgence {URGENCY_LABEL[result.urgency]}</Text>
            </View>
          </View>
          <Text style={styles.label}>Pathologies probables</Text>
          {result.pathologies.map((p) => (
            <View key={p} style={styles.pathoRow}>
              <Ionicons name="ellipse" size={7} color={colors.green} />
              <Text style={styles.patho}>{p}</Text>
            </View>
          ))}
          <Text style={[styles.label, { marginTop: spacing.md }]}>Conseil</Text>
          <Text style={styles.advice}>{result.advice}</Text>
          {result.recommendTeleconsult ? (
            <Button
              title="Téléconsulter un vétérinaire"
              onPress={() => nav.navigate('VetList', { title: 'Vétérinaires' })}
              style={{ marginTop: spacing.lg }}
            />
          ) : null}
        </View>
      ) : null}
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  disclaimer: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.greenPale, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  disclaimerText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.greenDark, lineHeight: 17 },
  q: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.brown, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.bgBlue, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.green },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  chipTextActive: { color: colors.white },
  result: { backgroundColor: colors.bgBlue, borderRadius: radii.lg, padding: spacing.lg, marginTop: spacing.xl },
  resultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  resultTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.brown },
  urgency: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  urgencyText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.green, marginBottom: spacing.xs },
  pathoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  patho: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  advice: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 20 },
});
