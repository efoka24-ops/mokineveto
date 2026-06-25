import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing, shadow } from '../../theme';
import { getVet, type Vet } from '../../services/vets';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'VetDetail'>;

export default function VetDetailScreen() {
  const nav = useNavigation<Nav>();
  const { id } = useRoute<Rt>().params;
  const [vet, setVet] = useState<Vet | null>(null);
  const { has, toggle, hydrate } = useFavoritesStore();

  useEffect(() => {
    hydrate();
    getVet(id).then((v) => setVet(v ?? null));
  }, [id, hydrate]);

  if (!vet) {
    return (
      <Screen>
        <TopBar title="Informations" />
        <ActivityIndicator color={colors.green} style={{ marginTop: spacing.xxl }} />
      </Screen>
    );
  }

  const fav = has(vet.id);

  return (
    <Screen
      scroll
      footer={<Button title="Prendre rendez-vous" onPress={() => nav.navigate('Schedule', { vetId: vet.id })} />}
    >
      <TopBar title="Informations" />

      {/* Hero card */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Image source={{ uri: vet.photo }} style={styles.heroAvatar} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <View style={styles.badge}>
              <Ionicons name="bulb-outline" size={13} color={colors.white} />
              <Text style={styles.badgeText}>{vet.experienceYears} ans d'expérience</Text>
            </View>
            <View style={styles.focusBox}>
              <Text style={styles.focusLabel}>Focus :</Text>
              <Text style={styles.focusText}>{vet.focus}</Text>
            </View>
          </View>
        </View>

        <View style={styles.nameCard}>
          <Text style={styles.name}>{vet.name}</Text>
          <Text style={styles.specialty}>{vet.specialty}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.metaText}>{vet.rating}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.white} />
            <Text style={styles.metaText}>{vet.reviews}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={13} color={colors.white} />
            <Text style={styles.metaText} numberOfLines={1}>{vet.schedule}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.calendarBtn} onPress={() => nav.navigate('Schedule', { vetId: vet.id })}>
            <Ionicons name="calendar-outline" size={16} color={colors.white} />
            <Text style={styles.calendarText}>Calendrier</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <RoundAction icon="chatbubble-outline" onPress={() => nav.navigate('Chat', { vetId: vet.id, name: vet.name })} />
          <RoundAction icon={fav ? 'heart' : 'heart-outline'} tint={fav ? colors.green : colors.brown} onPress={() => toggle(vet.id)} />
        </View>
      </View>

      {/* Sections */}
      <Section title="Profil">
        Vétérinaire spécialisé en {vet.specialty.toLowerCase()}, {vet.experienceYears} ans d'expérience au service
        des éleveurs en milieu rural. Consultations à distance et suivi des troupeaux.
      </Section>
      <Section title="Parcours">
        Diplômé(e) et inscrit(e) à l'Ordre des vétérinaires (réf. {vet.ordreNumber}). Interventions de terrain,
        prévention sanitaire et appui aux exploitations.
      </Section>
      <Section title="Points forts">
        {vet.focus}
      </Section>
      <View style={{ height: spacing.md }} />
    </Screen>
  );
}

function RoundAction({ icon, tint = colors.brown, onPress }: { icon: keyof typeof Ionicons.glyphMap; tint?: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.roundAction} onPress={onPress}>
      <Ionicons name={icon} size={18} color={tint} />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.brown, borderRadius: radii.xl, padding: spacing.lg },
  heroTop: { flexDirection: 'row', gap: spacing.md },
  heroAvatar: { width: 110, height: 130, borderRadius: radii.lg },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.green, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white },
  focusBox: { backgroundColor: colors.green, borderRadius: radii.md, padding: spacing.md },
  focusLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white },
  focusText: { fontFamily: fonts.body, fontSize: 12, color: colors.white, lineHeight: 17 },
  nameCard: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.brown },
  specialty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff22', borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 5, flexShrink: 1 },
  metaText: { fontFamily: fonts.body, fontSize: 11, color: colors.white },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  calendarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.green, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: 8 },
  calendarText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.white },
  roundAction: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.brown, marginBottom: spacing.xs },
  sectionBody: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 20 },
});
