import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../theme';
import type { AlertSeverity, HealthAlert } from '../services/alerts';

/** Habillage par gravité — une alerte critique doit se distinguer d'un simple rappel. */
const SEVERITY: Record<AlertSeverity, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  INFO: { bg: colors.greenPale, fg: colors.brown, icon: 'information-circle' },
  WARNING: { bg: '#FFE9C7', fg: '#8A5300', icon: 'alert-circle' },
  CRITICAL: { bg: '#FBD7D7', fg: '#A11A1A', icon: 'warning' },
};

/**
 * Bandeau d'alertes sanitaires régionales (SFD §4.2).
 * Rien n'est affiché en l'absence d'alerte : un bandeau vide occuperait l'espace
 * le plus visible du tableau de bord sans rien apporter.
 */
export default function AlertBanner({
  alerts,
  onPress,
}: {
  alerts: HealthAlert[];
  onPress?: (alert: HealthAlert) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {alerts.map((a) => {
        const s = SEVERITY[a.severity] ?? SEVERITY.INFO;
        return (
          <Pressable
            key={a.id}
            style={[styles.card, { backgroundColor: s.bg }, alerts.length === 1 && styles.single]}
            onPress={() => onPress?.(a)}
            accessibilityRole="button"
            accessibilityLabel={`Alerte sanitaire : ${a.title}`}
          >
            <Ionicons name={s.icon} size={20} color={s.fg} />
            <View style={styles.text}>
              <Text style={[styles.title, { color: s.fg }]} numberOfLines={1}>
                {a.title}
              </Text>
              <Text style={[styles.body, { color: s.fg }]} numberOfLines={2}>
                {a.body}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginBottom: spacing.lg },
  content: { gap: spacing.md },
  card: {
    width: 300,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  single: { width: '100%', minWidth: 300 },
  text: { flex: 1 },
  title: { fontFamily: fonts.bodyBold, fontSize: 13 },
  body: { fontFamily: fonts.body, fontSize: 12, marginTop: 1 },
});
