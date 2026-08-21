import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useHerdStore } from '../../store/useHerdStore';
import { listAlerts, type HealthAlert } from '../../services/alerts';
import { getLocalWeather, type Weather } from '../../services/weather';
import AlertBanner from '../../components/AlertBanner';
import WeatherWidget from '../../components/WeatherWidget';
import HomeAction from '../../components/HomeAction';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Un animal est considéré en suivi actif dès qu'il porte au moins un événement de santé. */
function hasActiveRecord(animal: { healthEvents?: unknown[] }): boolean {
  return (animal.healthEvents?.length ?? 0) > 0;
}

/**
 * Une échéance est « à venir » si elle tombe dans les 30 jours.
 * Le rappel de notification part à J-7 (SFD §4.11) ; l'accueil ouvre une fenêtre
 * plus large pour laisser à l'éleveur le temps de s'organiser.
 */
function isUpcoming(dateIso?: string): boolean {
  if (!dateIso) return false;
  const due = new Date(dateIso).getTime();
  if (Number.isNaN(due)) return false;
  const now = Date.now();
  return due >= now && due - now <= 30 * 24 * 60 * 60 * 1000;
}

/**
 * Tableau de bord Éleveur (SFD §4.2).
 *
 * Composition imposée par la spécification : six boutons principaux à icônes
 * larges, un widget météo avec alerte épizootique, un bandeau d'alertes
 * sanitaires régionales et un résumé du cheptel.
 *
 * Cet écran suit la SFD et non la maquette Figma, qui décrivait un annuaire de
 * prestataires — arbitrage rendu par le propriétaire du produit le 2026-08-21
 * (constat C-01 de l'audit de design).
 *
 * Le bouton Urgence rouge permanent n'est pas monté ici mais au-dessus de la
 * navigation à onglets, afin de rester atteignable depuis tout écran comme
 * l'exige la spécification (voir components/EmergencyButton).
 */
export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const animals = useHerdStore((s) => s.animals);
  const hydrate = useHerdStore((s) => s.hydrate);

  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [weather, setWeather] = useState<Weather>({ available: false, risk: 'LOW', reasons: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Chargements indépendants : l'échec de l'un ne doit pas priver l'éleveur
    // des autres. Chaque service échoue déjà en silence de son côté.
    await Promise.all([
      hydrate().catch(() => {}),
      listAlerts().then(setAlerts),
      getLocalWeather().then(setWeather),
    ]);
  }, [hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Résumé du cheptel (SFD §4.2)
  const bySpecies = animals.reduce<Record<string, number>>((acc, a) => {
    acc[a.species] = (acc[a.species] ?? 0) + 1;
    return acc;
  }, {});
  const withRecord = animals.filter(hasActiveRecord).length;
  const upcomingVaccinations = animals.reduce(
    (n, a) => n + (a.healthEvents?.filter((e) => isUpcoming(e.nextDueAt)).length ?? 0),
    0
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />
        }
      >
        {/* En-tête */}
        <View style={styles.header}>
          <Pressable
            style={styles.userRow}
            onPress={() => nav.navigate('Main', { screen: 'ProfileTab' })}
            accessibilityRole="button"
            accessibilityLabel="Mon profil"
          >
            <Image
              source={{ uri: user?.avatarUrl ?? 'https://i.pravatar.cc/100?u=mokinevet' }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.hello}>Bonjour</Text>
              <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'Bienvenue'}</Text>
            </View>
          </Pressable>
          <View style={styles.headerIcons}>
            <RoundIcon icon="notifications-outline" label="Notifications" onPress={() => nav.navigate('Notifications')} />
            <RoundIcon icon="settings-outline" label="Paramètres" onPress={() => nav.navigate('Settings')} />
          </View>
        </View>

        {/* Alertes sanitaires régionales */}
        <AlertBanner alerts={alerts} />

        {/* Météo locale et risque épizootique */}
        <WeatherWidget weather={weather} />

        {/* Six boutons principaux */}
        <View style={styles.actions}>
          <HomeAction
            icon="cow"
            label="Mon Cheptel"
            badge={animals.length}
            onPress={() => nav.navigate('HerdList')}
          />
          <HomeAction
            icon="medical-bag"
            label="Consulter un Vétérinaire"
            onPress={() => nav.navigate('VetList', { title: 'Vétérinaires' })}
          />
          <HomeAction
            icon="virus-outline"
            label="Mes Animaux malades"
            badge={withRecord}
            onPress={() => nav.navigate('HerdList')}
          />
          <HomeAction
            icon="calendar-clock"
            label="Mes RDV"
            onPress={() => nav.navigate('Main', { screen: 'Agenda' })}
          />
          <HomeAction
            icon="message-text-outline"
            label="Mes Messages"
            onPress={() => nav.navigate('Main', { screen: 'Messages' })}
          />
          <HomeAction
            icon="alert-octagon"
            label="Urgence"
            tone="danger"
            onPress={() => nav.navigate('Emergency')}
          />
        </View>

        {/* Résumé du cheptel */}
        <Text style={styles.section}>Mon cheptel en un coup d'œil</Text>
        <View style={styles.summary}>
          <SummaryTile value={animals.length} label="animaux" icon="cow" />
          <SummaryTile value={withRecord} label="dossiers actifs" icon="file-document-outline" />
          <SummaryTile value={upcomingVaccinations} label="vaccins à venir" icon="needle" />
        </View>

        {Object.keys(bySpecies).length > 0 && (
          <View style={styles.speciesCard}>
            {Object.entries(bySpecies).map(([species, count], i) => (
              <View key={species} style={[styles.speciesRow, i > 0 && styles.speciesBorder]}>
                <Text style={styles.speciesName}>{species}</Text>
                <Text style={styles.speciesCount}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {animals.length === 0 && (
          <Pressable style={styles.emptyCard} onPress={() => nav.navigate('AddAnimal')}>
            <MaterialCommunityIcons name="plus-circle-outline" size={28} color={colors.green} />
            <Text style={styles.emptyTitle}>Aucun animal enregistré</Text>
            <Text style={styles.emptyBody}>
              Ajoutez un premier animal pour suivre sa santé et ses vaccinations.
            </Text>
          </Pressable>
        )}

        {/* Espace pour la barre d'onglets et le bouton d'urgence flottant. */}
        <View style={{ height: 150 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View style={styles.summaryTile}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.green} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function RoundIcon({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.roundIcon}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgBlue },
  content: { padding: spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  userRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  hello: { fontFamily: fonts.body, color: colors.green, fontSize: 13 },
  name: { fontFamily: fonts.bodyBold, color: colors.brown, fontSize: 16 },
  headerIcons: { flexDirection: 'row', gap: spacing.md },
  // 48 dp : minimum de cible tactile exigé par la SFD §8.2.
  roundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },

  section: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.brown,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },

  summary: { flexDirection: 'row', gap: spacing.md },
  summaryTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    ...shadow.soft,
  },
  summaryValue: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.brown, marginTop: 2 },
  summaryLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.grey, textAlign: 'center' },

  speciesCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    ...shadow.soft,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  speciesBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  speciesName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  speciesCount: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.green },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginTop: spacing.md,
    ...shadow.soft,
  },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brown, marginTop: spacing.sm },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.grey,
    textAlign: 'center',
    marginTop: 2,
  },
});
