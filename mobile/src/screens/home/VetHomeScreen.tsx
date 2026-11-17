import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppointmentsStore } from '../../store/useAppointmentsStore';
import { getMyVetProfile, updateMyAvailability, getMyVetStats, getMyEpidemiology, type MyVetProfile, type Vet, type VetStats, type EpidemiologyRegion } from '../../services/api';
import SideMenu, { type SideMenuItem } from '../../components/SideMenu';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Tableau de bord Vétérinaire (SFD §4.2).
 *
 * Contrairement à l'éleveur, le praticien n'a ni cheptel ni urgence à
 * déclencher : ce qui lui manque au quotidien, c'est de savoir où en est son
 * dossier de vérification et ce qui l'attend aujourd'hui.
 *
 */
export default function VetHomeScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const { items, hydrate } = useAppointmentsStore();

  const [profile, setProfile] = useState<MyVetProfile | null>(null);
  const [stats, setStats] = useState<VetStats | null>(null);
  const [regions, setRegions] = useState<EpidemiologyRegion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    await Promise.all([
      hydrate().catch(() => {}),
      getMyVetProfile().then(({ data }) => setProfile(data)).catch(() => {}),
      getMyVetStats().then(({ data }) => setStats(data)).catch(() => {}),
      getMyEpidemiology().then(({ data }) => setRegions(data)).catch(() => {}),
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

  const upcoming = items.filter((a) => a.status === 'UPCOMING');
  const todayCount = upcoming.filter((a) => a.date === upcoming[0]?.date).length;

  const menuItems: SideMenuItem[] = [
    { icon: 'calendar-clock', label: 'Mes rendez-vous', badge: upcoming.length, onPress: () => nav.navigate('Main', { screen: 'Agenda' }) },
    { icon: 'message-text-outline', label: 'Mes messages', onPress: () => nav.navigate('Main', { screen: 'Messages' }) },
    { icon: 'account-circle-outline', label: 'Mon profil', onPress: () => nav.navigate('Main', { screen: 'ProfileTab' }) },
    { icon: 'calendar-edit', label: 'Mon agenda', onPress: () => nav.navigate('VetAgenda') },
    { icon: 'book-outline', label: 'Fiches techniques', onPress: () => nav.navigate('FichesList') },
    { icon: 'map-marker-radius-outline', label: 'Signalements & épidémiologie', onPress: () => nav.navigate('VetEpidemiology') },
    { icon: 'share-outline', label: 'Pré-analyses partagées', onPress: () => nav.navigate('SharedPreAnalyses') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
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
              <Text style={styles.hello}>Bonjour Dr.</Text>
              <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'Bienvenue'}</Text>
            </View>
          </Pressable>
          <View style={styles.headerIcons}>
            <RoundIcon icon="notifications-outline" label="Notifications" onPress={() => nav.navigate('Notifications')} />
            <RoundIcon icon="menu" label="Menu" onPress={() => setMenuOpen(true)} />
          </View>
        </View>

        <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" items={menuItems} />

        {/* Statut de vérification (SFD §4.1.2) */}
        {profile && profile.verification !== 'APPROVED' && (
          <VerificationBanner profile={profile} onPress={() => nav.navigate('VetCredentials')} />
        )}

        {/* Disponibilité en temps réel (SFD §4.1.2) */}
        {profile && (
          <AvailabilitySwitch
            value={profile.availability}
            onChange={async (next) => {
              setProfile((p) => (p ? { ...p, availability: next } : p));
              try {
                await updateMyAvailability(next);
              } catch {
                load();
              }
            }}
          />
        )}

        {/* Résumé */}
        <Text style={styles.section}>En un coup d'œil</Text>
        <View style={styles.summary}>
          <SummaryTile value={upcoming.length} label="RDV à venir" icon="calendar-clock" />
          <SummaryTile value={todayCount} label="aujourd'hui" icon="calendar-today" />
          <SummaryTile value={profile?.reviews ?? 0} label="avis reçus" icon="star-outline" />
        </View>

        {stats && (
          <View style={[styles.summary, { marginTop: spacing.md }]}>
            <SummaryTile value={stats.consultations.completed} label="consultations" icon="stethoscope" />
            <SummaryTile value={stats.revenue.netThisMonth} label="net ce mois (FCFA)" icon="cash-multiple" />
            <SummaryTile value={stats.revenue.netTotal} label="net cumulé (FCFA)" icon="wallet-outline" />
          </View>
        )}

        {/* Prochains rendez-vous */}
        <Text style={styles.section}>Prochains rendez-vous</Text>
        {upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={28} color={colors.green} />
            <Text style={styles.emptyTitle}>Aucun rendez-vous à venir</Text>
            <Text style={styles.emptyBody}>
              Les demandes de consultation des éleveurs apparaîtront ici.
            </Text>
          </View>
        ) : (
          upcoming.slice(0, 3).map((a) => (
            <Pressable
              key={a.id}
              style={styles.apptCard}
              onPress={() => nav.navigate('AppointmentDetail', { id: a.id })}
            >
              <View style={styles.apptHead}>
                <Text style={styles.apptName}>{a.eleveurName ?? 'Éleveur'}</Text>
                <Text style={styles.apptTime}>{a.date} · {a.time}</Text>
              </View>
              <Text style={styles.apptReason} numberOfLines={1}>{a.reason}</Text>
            </Pressable>
          ))
        )}

        {/* Zone d'opérations */}
        <Text style={styles.section}>Zone d'opérations</Text>
        <Pressable style={styles.opsCard} onPress={() => nav.navigate('VetEpidemiology')}>
          <View style={styles.opsHead}>
            <MaterialCommunityIcons name="map-marker-radius" size={22} color={colors.green} />
            <Text style={styles.opsTitle}>{user?.country ?? 'Zone non renseignée'}</Text>
          </View>
          {regions.length === 0 ? (
            <Text style={styles.opsEmpty}>Aucun signalement dans votre zone pour l'instant.</Text>
          ) : (
            regions.slice(0, 4).map((r) => (
              <View key={r.region} style={styles.opsRow}>
                <Text style={styles.opsRegion} numberOfLines={1}>{r.region}</Text>
                <View style={styles.opsBarTrack}>
                  <View
                    style={[
                      styles.opsBarFill,
                      { width: `${Math.min(100, (r.total / (regions[0]?.total || 1)) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.opsCount}>{r.total}</Text>
              </View>
            ))
          )}
          <Text style={styles.opsHint}>Voir la carte épidémiologique détaillée →</Text>
        </Pressable>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const AVAILABILITY_LABEL: Record<Vet['availability'], string> = {
  DISPONIBLE: 'Disponible',
  OCCUPE: 'Occupé',
  ABSENT: 'Absent',
};
const AVAILABILITY_COLOR: Record<Vet['availability'], string> = {
  DISPONIBLE: colors.green,
  OCCUPE: '#E2A93B',
  ABSENT: colors.danger,
};

function AvailabilitySwitch({
  value,
  onChange,
}: {
  value: Vet['availability'];
  onChange: (next: Vet['availability']) => void;
}) {
  return (
    <View style={styles.availRow}>
      {(['DISPONIBLE', 'OCCUPE', 'ABSENT'] as const).map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            style={[styles.availPill, active && { backgroundColor: AVAILABILITY_COLOR[option] }]}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityLabel={`Se déclarer ${AVAILABILITY_LABEL[option].toLowerCase()}`}
          >
            <View style={[styles.availDot, { backgroundColor: active ? colors.white : AVAILABILITY_COLOR[option] }]} />
            <Text style={[styles.availText, active && styles.availTextActive]}>{AVAILABILITY_LABEL[option]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function VerificationBanner({ profile, onPress }: { profile: MyVetProfile; onPress: () => void }) {
  const rejected = profile.verification === 'REJECTED';
  const missingDocs = !profile.credentialsComplete;

  return (
    <Pressable
      style={[styles.banner, rejected && styles.bannerDanger]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons
        name={rejected ? 'close-circle-outline' : 'clock-outline'}
        size={24}
        color={rejected ? colors.white : colors.brown}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, rejected && styles.bannerTitleDanger]}>
          {rejected ? 'Compte refusé' : 'Compte en attente de validation'}
        </Text>
        <Text style={[styles.bannerBody, rejected && styles.bannerBodyDanger]}>
          {missingDocs
            ? "Déposez votre diplôme et votre carte de l'Ordre pour que votre dossier puisse être examiné."
            : "Votre dossier est complet. Il sera examiné par notre équipe sous 48 heures ouvrées."}
        </Text>
      </View>
    </Pressable>
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
  roundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  availRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  availPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.ink },
  availTextActive: { color: colors.white },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.greenPale,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greenPaleBorder,
  },
  bannerDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  bannerTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brown },
  bannerTitleDanger: { color: colors.white },
  bannerBody: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
  bannerBodyDanger: { color: colors.white },

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

  apptCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  apptHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  apptName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  apptTime: { fontFamily: fonts.body, fontSize: 12, color: colors.grey },
  apptReason: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginTop: 2 },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
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

  opsCard: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, ...shadow.soft },
  opsHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  opsTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brown },
  opsEmpty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey },
  opsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  opsRegion: { width: 90, fontFamily: fonts.body, fontSize: 12, color: colors.ink },
  opsBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.greenPale, overflow: 'hidden' },
  opsBarFill: { height: '100%', borderRadius: 4, backgroundColor: colors.green },
  opsCount: { width: 24, textAlign: 'right', fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.brown },
  opsHint: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.green, marginTop: spacing.sm },
});
