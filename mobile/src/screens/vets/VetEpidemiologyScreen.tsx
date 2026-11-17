import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { getMyEpidemiology, type EpidemiologyRegion } from '../../services/api';

/**
 * Signalements sanitaires par région (SFD §4.2 — « carte épidémiologique »).
 *
 * Présenté en liste, pas en carte interactive : aucune librairie de
 * cartographie n'est embarquée côté mobile, et l'agrégat par région (comptage
 * de signalements, pas un modèle prédictif) reste lisible sous cette forme.
 */
export default function VetEpidemiologyScreen() {
  const [rows, setRows] = useState<EpidemiologyRegion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyEpidemiology().then(({ data }) => {
      setRows(data);
      setLoading(false);
    });
  }, []);

  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Signalements par région" />
      <Text style={styles.intro}>
        Signalements des 90 derniers jours, toutes zones confondues — comptage descriptif, pas une
        prédiction d'épizootie.
      </Text>

      {loading ? (
        <Text style={styles.empty}>Chargement…</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>Aucun signalement sur la période.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {rows.map((r) => (
            <View key={r.region} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={styles.region}>{r.region.replace(/_/g, ' ')}</Text>
                <Text style={styles.count}>{r.total} signalement(s)</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(r.total / maxTotal) * 100}%` }]} />
                {r.high > 0 && (
                  <View style={[styles.barHigh, { width: `${(r.high / maxTotal) * 100}%` }]} />
                )}
              </View>
              {r.high > 0 && <Text style={styles.highLabel}>dont {r.high} urgence élevée</Text>}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginTop: spacing.md, marginBottom: spacing.lg, lineHeight: 19 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  row: { backgroundColor: colors.bgBlue, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.soft },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  region: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brown },
  count: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.green },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.green, position: 'absolute', left: 0, top: 0 },
  barHigh: { height: '100%', backgroundColor: colors.danger, position: 'absolute', left: 0, top: 0 },
  highLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.danger, marginTop: 4 },
});
