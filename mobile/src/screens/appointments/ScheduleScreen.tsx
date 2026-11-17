import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import {
  getVet,
  getVetAvailability,
  getAppointmentPricing,
  getFieldEstimate,
  type Vet,
  type AppointmentPricing,
  type ConsultationType,
} from '../../services/api';
import { useHerdStore } from '../../store/useHerdStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Schedule'>;

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** AAAA-MM-JJ en heure LOCALE (toISOString() serait en UTC et décalerait la date d'un jour). */
function localIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const TYPE_LABEL: Record<ConsultationType, string> = { CALL: 'Appel', VIDEO: 'Vidéo', FIELD: 'Terrain' };
const TYPE_ICON: Record<ConsultationType, keyof typeof Ionicons.glyphMap> = {
  CALL: 'call-outline',
  VIDEO: 'videocam-outline',
  FIELD: 'walk-outline',
};

export default function ScheduleScreen() {
  const nav = useNavigation<Nav>();
  const { vetId } = useRoute<Rt>().params;
  const [vet, setVet] = useState<Vet | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [consultationType, setConsultationType] = useState<ConsultationType>('VIDEO');
  const [pricing, setPricing] = useState<AppointmentPricing | null>(null);
  const [fieldEstimate, setFieldEstimate] = useState<{ available: boolean; amount?: number; distanceKm?: number } | null>(null);
  const farms = useHerdStore((s) => s.farms);
  const defaultFarm = farms.find((f) => f.isDefault) ?? farms[0];

  const [pricingError, setPricingError] = useState(false);

  const loadPricing = () => {
    setPricingError(false);
    getAppointmentPricing()
      .then((res) => setPricing(res.data))
      .catch(() => setPricingError(true));
  };

  useEffect(() => {
    getVet(vetId).then((response) => setVet(response?.data ?? null));
    loadPricing();
  }, [vetId]);

  useEffect(() => {
    if (consultationType !== 'FIELD') return;
    getFieldEstimate(vetId, defaultFarm?.id)
      .then((res) => setFieldEstimate(res.data))
      .catch(() => setFieldEstimate({ available: false }));
  }, [consultationType, vetId, defaultFarm?.id]);

  const currentAmount =
    consultationType === 'CALL' ? pricing?.call
    : consultationType === 'VIDEO' ? pricing?.video
    : fieldEstimate?.amount;

  const week = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return { date: d, iso: localIso(d), dow: DAYS[(d.getDay() + 6) % 7], day: d.getDate() };
    });
  }, []);

  // Créneaux des 7 prochains jours, chargés d'un coup : un vétérinaire ne
  // travaille souvent que certains jours, et l'éleveur ne doit pas avoir à
  // deviner lesquels en cliquant jour par jour.
  const [slotsByDay, setSlotsByDay] = useState<string[][] | null>(null);
  const [availError, setAvailError] = useState(false);

  const loadWeek = () => {
    setAvailError(false);
    setSlotsByDay(null);
    Promise.allSettled(week.map((d) => getVetAvailability(vetId, d.iso))).then((results) => {
      if (results.every((r) => r.status === 'rejected')) {
        setAvailError(true);
        setSlotsByDay(week.map(() => []));
        return;
      }
      const byDay = results.map((r) => (r.status === 'fulfilled' ? r.value : []));
      setSlotsByDay(byDay);
      const first = byDay.findIndex((s) => s.length > 0);
      setDayIdx(first === -1 ? 0 : first);
    });
  };

  useEffect(() => {
    loadWeek();
  }, [vetId, week]);

  useEffect(() => {
    const daySlots = slotsByDay?.[dayIdx] ?? [];
    setSlots(daySlots);
    setSlot((prev) => (daySlots.includes(prev) ? prev : daySlots[0] ?? ''));
    setLoading(slotsByDay === null);
  }, [slotsByDay, dayIdx]);

  const confirm = () => {
    const selectedDate = week[dayIdx];
    if (!selectedDate || !slot || currentAmount === undefined) return;
    if (consultationType === 'FIELD' && !fieldEstimate?.available) return;

    nav.navigate('PaymentRecap', {
      vetId,
      amount: currentAmount,
      consultationType,
      farmId: consultationType === 'FIELD' ? defaultFarm?.id : undefined,
      distanceKm: fieldEstimate?.distanceKm,
      date: selectedDate.iso,
      time: slot,
      reason,
    });
  };

  return (
    <Screen
      bg={colors.white}
      footer={
        <Button
          title="Continuer"
          variant="blue"
          disabled={!slot || currentAmount === undefined || (consultationType === 'FIELD' && !fieldEstimate?.available)}
          onPress={confirm}
        />
      }
    >
      <TopBar title={vet?.name ?? 'Rendez-vous'} tint={colors.green} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Type de consultation</Text>
        <View style={styles.typeRow}>
          {(['CALL', 'VIDEO', 'FIELD'] as ConsultationType[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.typeChip, consultationType === t && styles.typeChipActive]}
              onPress={() => setConsultationType(t)}
            >
              <Ionicons name={TYPE_ICON[t]} size={18} color={consultationType === t ? colors.white : colors.greenDark} />
              <Text style={[styles.typeLabel, consultationType === t && styles.typeLabelActive]}>{TYPE_LABEL[t]}</Text>
            </Pressable>
          ))}
        </View>

        {pricingError && (
          <Pressable style={styles.warnBox} onPress={loadPricing}>
            <Ionicons name="refresh-outline" size={16} color={colors.star} />
            <Text style={styles.warnText}>
              Impossible de charger les tarifs (connexion instable). Touchez ici pour réessayer.
            </Text>
          </Pressable>
        )}

        {consultationType === 'FIELD' && fieldEstimate && !fieldEstimate.available && (
          <View style={styles.warnBox}>
            <Ionicons name="warning-outline" size={16} color={colors.star} />
            <Text style={styles.warnText}>
              Position de l'exploitation manquante : renseignez-la depuis Mon Cheptel pour estimer le tarif terrain.
            </Text>
          </View>
        )}

        {/* Week strip */}
        <View style={styles.weekStrip}>
          {week.map((d, i) => {
            const empty = slotsByDay !== null && slotsByDay[i].length === 0;
            return (
              <Pressable
                key={i}
                style={[styles.day, i === dayIdx && styles.dayActive, empty && i !== dayIdx && styles.dayEmpty]}
                onPress={() => setDayIdx(i)}
              >
                <Text style={[styles.dayNum, i === dayIdx && styles.dayTextActive]}>{d.day}</Text>
                <Text style={[styles.dayDow, i === dayIdx && styles.dayTextActive]}>{d.dow}</Text>
              </Pressable>
            );
          })}
        </View>

        {availError && (
          <Pressable style={styles.warnBox} onPress={loadWeek}>
            <Ionicons name="refresh-outline" size={16} color={colors.star} />
            <Text style={styles.warnText}>
              Impossible de charger les disponibilités (connexion instable). Touchez ici pour réessayer.
            </Text>
          </Pressable>
        )}
        {!availError && slotsByDay !== null && slotsByDay.every((s) => s.length === 0) && (
          <View style={styles.warnBox}>
            <Ionicons name="calendar-outline" size={16} color={colors.star} />
            <Text style={styles.warnText}>
              Ce vétérinaire n'a aucune disponibilité dans les 7 prochains jours. Essayez un autre praticien ou revenez plus tard.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Créneaux disponibles</Text>
        <View style={styles.slots}>
          {loading ? (
            <Text style={styles.slotText}>Chargement…</Text>
          ) : slots.length > 0 ? (
            slots.map((s) => (
              <Pressable
                key={s}
                style={[styles.slot, s === slot && styles.slotActive]}
                onPress={() => setSlot(s)}
              >
                <Text style={[styles.slotText, s === slot && styles.slotTextActive]}>{s}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.slotText}>Aucun créneau disponible</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Décrivez le problème</Text>
        <View style={styles.textareaWrap}>
          <TextInput
            placeholder="Symptômes observés, espèce, durée…"
            placeholderTextColor={colors.grey}
            multiline
            value={reason}
            onChangeText={setReason}
            style={styles.textarea}
          />
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.blue} />
          <Text style={styles.infoText}>
            {currentAmount !== undefined
              ? `Montant de la consultation : ${currentAmount.toLocaleString('fr-FR')} FCFA${
                  consultationType === 'FIELD' && fieldEstimate?.distanceKm ? ` (${fieldEstimate.distanceKm} km)` : ''
                }`
              : 'Calcul du tarif en cours…'}
          </Text>
        </View>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.greenPale },
  typeChipActive: { backgroundColor: colors.greenDark },
  typeLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.greenDark },
  typeLabelActive: { color: colors.white },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FFF3D6', borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  warnText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: '#8A5300' },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.greenPale, borderRadius: radii.lg, padding: spacing.sm, marginBottom: spacing.lg },
  day: { width: 42, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
  dayActive: { backgroundColor: colors.greenDark },
  dayEmpty: { opacity: 0.4 },
  dayNum: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.greenDark },
  dayDow: { fontFamily: fonts.body, fontSize: 11, color: colors.greenDark },
  dayTextActive: { color: colors.white },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.green, marginBottom: spacing.md },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  slot: { backgroundColor: colors.greenPale, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: 8 },
  slotActive: { backgroundColor: colors.greenDark },
  slotText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.greenDark },
  slotTextActive: { color: colors.white },
  textareaWrap: { backgroundColor: colors.greenPale, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  textarea: { minHeight: 90, fontFamily: fonts.body, fontSize: 14, color: colors.ink, textAlignVertical: 'top' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.blue },
});
