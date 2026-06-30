import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { getVet, getVetAvailability, type Vet } from '../../services/api';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Schedule'>;

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function ScheduleScreen() {
  const nav = useNavigation<Nav>();
  const { vetId } = useRoute<Rt>().params;
  const [vet, setVet] = useState<Vet | null>(null);
  const [dayIdx, setDayIdx] = useState(2);
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getVet(vetId).then((response) => setVet(response?.data ?? null));
  }, [vetId]);

  const week = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return { date: d, dow: DAYS[(d.getDay() + 6) % 7], day: d.getDate() };
    });
  }, []);

  useEffect(() => {
    const loadSlots = async () => {
      try {
        setLoading(true);
        const targetDate = week[dayIdx]?.date;
        if (!targetDate) return;

        const isoDate = targetDate.toISOString().split('T')[0];
        const response = await getVetAvailability(vetId, isoDate);
        const availableSlots = response.data?.slots || [];
        setSlots(availableSlots);
        if (availableSlots.length > 0) {
          setSlot(availableSlots[0]);
        }
      } catch (_err) {
        console.warn('[ScheduleScreen] Failed to load availability');
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [dayIdx, vetId, week]);

  const confirm = () => {
    const selectedDate = week[dayIdx];
    if (!selectedDate || !slot) return;

    nav.navigate('PaymentRecap', {
      vetId,
      amount: vet?.hourlyRate ?? 8000,
      date: selectedDate.date.toISOString().split('T')[0],
      time: slot,
      reason,
    });
  };

  return (
    <Screen bg={colors.white} footer={<Button title="Continuer" variant="blue" onPress={confirm} />}>
      <TopBar title={vet?.name ?? 'Rendez-vous'} tint={colors.green} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Week strip */}
        <View style={styles.weekStrip}>
          {week.map((d, i) => (
            <Pressable
              key={i}
              style={[styles.day, i === dayIdx && styles.dayActive]}
              onPress={() => setDayIdx(i)}
            >
              <Text style={[styles.dayNum, i === dayIdx && styles.dayTextActive]}>{d.day}</Text>
              <Text style={[styles.dayDow, i === dayIdx && styles.dayTextActive]}>{d.dow}</Text>
            </Pressable>
          ))}
        </View>

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
            Montant de la consultation : {(vet?.hourlyRate ?? 8000).toLocaleString('fr-FR')} XAF
          </Text>
        </View>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.greenPale, borderRadius: radii.lg, padding: spacing.sm, marginBottom: spacing.lg },
  day: { width: 42, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
  dayActive: { backgroundColor: colors.greenDark },
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
