import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { getCarnet, type Carnet } from '../../services/api';

/**
 * Carnet de santé numérique de l'éleveur (demande client) : agrège cheptel,
 * événements de santé et prescriptions. Imprimable — pas de bibliothèque PDF
 * disponible côté serveur (hébergement mutualisé, sans Composer) ; l'export
 * PDF se fait via l'impression du navigateur, fonctionnellement équivalent.
 */
export default function CarnetScreen() {
  const [carnet, setCarnet] = useState<Carnet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCarnet()
      .then((res) => setCarnet(res.data))
      .catch(() => setCarnet(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Screen>
        <TopBar title="Mon carnet" />
        <Text style={styles.muted}>Chargement…</Text>
      </Screen>
    );
  }

  if (!carnet) {
    return (
      <Screen>
        <TopBar title="Mon carnet" />
        <Text style={styles.muted}>Impossible de charger le carnet pour l'instant.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TopBar
        title="Mon carnet"
        right={
          <Pressable onPress={() => (globalThis as any).print?.()} hitSlop={10}>
            <Ionicons name="print-outline" size={22} color={colors.green} />
          </Pressable>
        }
      />

      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{carnet.eleveur.name}</Text>
        <Text style={styles.headerMeta}>{carnet.eleveur.phone} · {carnet.eleveur.country}</Text>
        <Text style={styles.headerMeta}>Généré le {new Date(carnet.generatedAt).toLocaleDateString('fr-FR')}</Text>
      </View>

      <Text style={styles.sectionTitle}>Cheptel ({carnet.animals.length})</Text>
      {carnet.animals.length === 0 ? (
        <Text style={styles.muted}>Aucun animal enregistré.</Text>
      ) : (
        carnet.animals.map((a) => (
          <View key={a.id} style={styles.animalCard}>
            <Text style={styles.animalName}>{a.name}</Text>
            <Text style={styles.animalMeta}>{a.species} · {a.breed} · {a.sex} · {a.age}</Text>
            {a.healthEvents.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                {a.healthEvents.map((e) => (
                  <Text key={e.id} style={styles.eventLine}>
                    • {e.label} — {new Date(e.date).toLocaleDateString('fr-FR')}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Prescriptions ({carnet.prescriptions.length})</Text>
      {carnet.prescriptions.length === 0 ? (
        <Text style={styles.muted}>Aucune prescription pour l'instant.</Text>
      ) : (
        carnet.prescriptions.map((p) => (
          <View key={p.id} style={styles.animalCard}>
            <Text style={styles.animalName}>{p.vetName}</Text>
            <Text style={styles.animalMeta}>
              {new Date(p.consultationDate).toLocaleDateString('fr-FR')} · {p.consultationType}
            </Text>
            {p.medications.map((m, i) => (
              <Text key={i} style={styles.eventLine}>• {m.name} — {m.dosage} · {m.route}</Text>
            ))}
            {p.instructions ? <Text style={styles.instructions}>{p.instructions}</Text> : null}
          </View>
        ))
      )}

      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  headerCard: { backgroundColor: colors.brown, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.white },
  headerMeta: { fontFamily: fonts.body, fontSize: 12, color: '#ffffffaa', marginTop: 2 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.brown, marginTop: spacing.lg, marginBottom: spacing.md },
  animalCard: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.soft },
  animalName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  animalMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
  eventLine: { fontFamily: fonts.body, fontSize: 12, color: colors.ink, marginTop: 4 },
  instructions: { fontFamily: fonts.body, fontSize: 12, color: colors.greenDark, marginTop: spacing.sm, fontStyle: 'italic' },
});
