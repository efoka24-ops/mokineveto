import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, shadow, spacing } from '../theme';
import { RISK_LABEL, type EpizooticRisk, type Weather } from '../services/weather';

const RISK_STYLE: Record<EpizooticRisk, { bg: string; fg: string }> = {
  LOW: { bg: colors.greenPale, fg: colors.greenDark },
  MODERATE: { bg: '#FFE9C7', fg: '#8A5300' },
  HIGH: { bg: '#FBD7D7', fg: '#A11A1A' },
};

/**
 * Widget météo local avec alerte épizootique (SFD §4.2).
 *
 * Rien n'est affiché quand la météo est indisponible — localisation refusée,
 * fournisseur non configuré ou en panne. Un widget vide ou en erreur serait plus
 * nuisible qu'utile sur l'écran principal d'un utilisateur peu à l'aise avec
 * l'écrit.
 */
export default function WeatherWidget({ weather }: { weather: Weather }) {
  if (!weather.available) return null;

  const risk = RISK_STYLE[weather.risk] ?? RISK_STYLE.LOW;
  const showRisk = weather.risk !== 'LOW';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.temp}>
          <Ionicons name="partly-sunny" size={28} color={colors.green} />
          <Text style={styles.degrees}>
            {weather.temperature !== undefined ? `${Math.round(weather.temperature)}°` : '—'}
          </Text>
        </View>

        <View style={styles.info}>
          {!!weather.place && (
            <Text style={styles.place} numberOfLines={1}>
              {weather.place}
            </Text>
          )}
          {!!weather.description && (
            <Text style={styles.description} numberOfLines={1}>
              {weather.description}
            </Text>
          )}
          {weather.humidity !== undefined && (
            <Text style={styles.detail}>Humidité {weather.humidity} %</Text>
          )}
        </View>

        <View style={[styles.badge, { backgroundColor: risk.bg }]}>
          <Text style={[styles.badgeText, { color: risk.fg }]}>{RISK_LABEL[weather.risk]}</Text>
        </View>
      </View>

      {showRisk && weather.reasons.length > 0 && (
        <View style={[styles.reasons, { backgroundColor: risk.bg }]}>
          {weather.reasons.map((r, i) => (
            <Text key={i} style={[styles.reason, { color: risk.fg }]}>
              • {r}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.soft,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  temp: { alignItems: 'center' },
  degrees: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.brown },
  info: { flex: 1 },
  place: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brown },
  description: { fontFamily: fonts.body, fontSize: 12, color: colors.ink, textTransform: 'capitalize' },
  detail: { fontFamily: fonts.body, fontSize: 11, color: colors.grey },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  reasons: { borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md, gap: 3 },
  reason: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
});
