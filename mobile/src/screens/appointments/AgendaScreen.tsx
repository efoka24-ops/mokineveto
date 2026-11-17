import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useAppointmentsStore, type Appointment } from '../../store/useAppointmentsStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_COLOR: Record<Appointment['status'], string> = {
  UPCOMING: colors.blue,
  COMPLETED: colors.green,
  CANCELLED: colors.danger,
};
const STATUS_LABEL: Record<Appointment['status'], string> = {
  UPCOMING: 'À venir',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

const TABS: { key: Appointment['status']; label: string }[] = [
  { key: 'UPCOMING', label: 'À venir' },
  { key: 'COMPLETED', label: 'Terminés' },
  { key: 'CANCELLED', label: 'Annulés' },
];

export default function AgendaScreen() {
  const nav = useNavigation<Nav>();
  const { items, hydrate } = useAppointmentsStore();
  const isVet = useAuthStore((s) => s.user?.role === 'VETERINAIRE');
  const [tab, setTab] = useState<Appointment['status']>('UPCOMING');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => items.filter((a) => a.status === tab), [items, tab]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Mes rendez-vous</Text>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.blueSoft} />
            <Text style={styles.emptyText}>Aucun rendez-vous dans cette catégorie.</Text>
          </View>
        ) : (
          filtered.map((a) => (
            <Pressable key={a.id} style={styles.card} onPress={() => nav.navigate('AppointmentDetail', { id: a.id })}>
              <View style={styles.cardHead}>
                <Text style={styles.vetName}>{isVet ? a.eleveurName ?? 'Éleveur' : a.vetName}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[a.status] }]}>
                  <Text style={styles.badgeText}>{STATUS_LABEL[a.status]}</Text>
                </View>
              </View>
              <Text style={styles.specialty}>{isVet ? a.reason : a.specialty}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.grey} />
                <Text style={styles.meta}>{a.date}</Text>
                <Ionicons name="time-outline" size={14} color={colors.grey} style={{ marginLeft: spacing.md }} />
                <Text style={styles.meta}>{a.time}</Text>
              </View>
            </Pressable>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgBlue },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.blue, textAlign: 'center', paddingVertical: spacing.lg },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.pill, alignItems: 'center', backgroundColor: colors.white },
  tabActive: { backgroundColor: colors.blue },
  tabText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.blue },
  tabTextActive: { color: colors.white },
  content: { paddingHorizontal: spacing.xl },
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.md },
  emptyText: { fontFamily: fonts.body, color: colors.grey },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.soft },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vetName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white },
  specialty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginLeft: 4 },
});
