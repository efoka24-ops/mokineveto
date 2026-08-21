import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../../components/Screen';
import TopBar from '../../components/TopBar';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { listVets, type Vet } from '../../services/vets';
import { useHerdStore } from '../../store/useHerdStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Gestes conservatoires, applicables sans avis vétérinaire préalable.
 * Ce sont des mesures de première urgence — isolement, hydratation, observation
 * — et non un traitement : la responsabilité médicale reste au praticien
 * (SFD §4.4, « orientation, pas diagnostic »).
 */
const FIRST_AID = [
  { icon: 'account-group-outline' as const, text: "Isolez l'animal du reste du troupeau." },
  { icon: 'water-outline' as const, text: 'Assurez un accès à de l\'eau propre et à l\'ombre.' },
  { icon: 'camera-outline' as const, text: 'Photographiez les lésions ou le comportement anormal.' },
  { icon: 'clipboard-text-outline' as const, text: 'Notez l\'heure d\'apparition des premiers signes.' },
  { icon: 'hand-back-right-outline' as const, text: "N'administrez aucun médicament sans avis du vétérinaire." },
];

/**
 * Écran d'urgence (SFD §4.2, §4.5.1).
 *
 * Portée actuelle : gestes conservatoires immédiats et mise en relation directe
 * avec les praticiens disponibles.
 *
 * La diffusion automatique aux cinq vétérinaires disponibles les plus proches,
 * avec réponse sous 10 minutes et majoration de 20 %, suppose la géolocalisation
 * et le moteur d'acheminement du bloc 3 — elle n'est pas encore implémentée
 * (tâches T042 et T043). L'écran ne prétend donc pas diffuser : il oriente vers
 * un contact immédiat.
 */
export default function EmergencyScreen() {
  const nav = useNavigation<Nav>();
  const animals = useHerdStore((s) => s.animals);
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    listVets()
      .then(setVets)
      .catch(() => setVets([]))
      .finally(() => setLoading(false));
  }, []);

  const selectedAnimal = animals.find((a) => a.id === selected);

  return (
    <Screen scroll={false}>
      <TopBar title="Urgence" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Ionicons name="warning" size={30} color={colors.white} />
          <Text style={styles.heroTitle}>Consultation prioritaire</Text>
          <Text style={styles.heroBody}>
            Appliquez les gestes ci-dessous, puis contactez immédiatement un vétérinaire disponible.
          </Text>
        </View>

        <Text style={styles.section}>Gestes immédiats</Text>
        <View style={styles.card}>
          {FIRST_AID.map((step, i) => (
            <View key={i} style={[styles.step, i > 0 && styles.stepBorder]}>
              <MaterialCommunityIcons name={step.icon} size={22} color={colors.green} />
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {animals.length > 0 && (
          <>
            <Text style={styles.section}>Animal concerné</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {animals.map((a) => {
                const active = a.id === selected;
                return (
                  <Pressable
                    key={a.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setSelected(active ? null : a.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Animal ${a.name}, ${a.species}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={[styles.chipSub, active && styles.chipTextActive]} numberOfLines={1}>
                      {a.species}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <Text style={styles.section}>Vétérinaires à contacter</Text>
        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginVertical: spacing.xl }} />
        ) : vets.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>
              Aucun vétérinaire n'a pu être chargé. Vérifiez votre connexion, puis réessayez.
            </Text>
          </View>
        ) : (
          vets.slice(0, 5).map((v) => (
            <View key={v.id} style={styles.vetRow}>
              <Image source={{ uri: v.photo }} style={styles.vetAvatar} />
              <View style={styles.vetInfo}>
                <Text style={styles.vetName} numberOfLines={1}>{v.name}</Text>
                <Text style={styles.vetSpec} numberOfLines={1}>{v.specialty}</Text>
              </View>
              <Pressable
                style={styles.contact}
                onPress={() => nav.navigate('Chat', { vetId: v.id, name: v.name })}
                accessibilityRole="button"
                accessibilityLabel={`Contacter ${v.name} en urgence`}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color={colors.white} />
              </Pressable>
            </View>
          ))
        )}

        {!!selectedAnimal && (
          <Pressable
            style={styles.assistant}
            onPress={() => nav.navigate('Chatbot')}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="robot-outline" size={22} color={colors.white} />
            <Text style={styles.assistantText}>
              Décrire les symptômes de {selectedAnimal.name} à l'assistant
            </Text>
          </Pressable>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  hero: {
    backgroundColor: colors.danger,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.white, marginTop: spacing.sm },
  heroBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  section: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.brown,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, ...shadow.soft },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  stepBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  stepText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, textAlign: 'center' },

  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    minWidth: 92,
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.greenDark },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.brown },
  chipSub: { fontFamily: fonts.body, fontSize: 11, color: colors.grey },
  chipTextActive: { color: colors.white },

  vetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  vetAvatar: { width: 48, height: 48, borderRadius: 24 },
  vetInfo: { flex: 1 },
  vetName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brown },
  vetSpec: { fontFamily: fonts.body, fontSize: 12, color: colors.grey },
  contact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  assistant: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.brown,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  assistantText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
});
