import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Input, Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { getMySchedule, setMyScheduleDay, type ScheduleDay } from '../../services/api';

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/**
 * Agenda du praticien (SFD §4.2) : créneaux ouverts/fermés par jour de la
 * semaine. Chaque changement est envoyé dès qu'il est fait — pas de bouton
 * « Enregistrer » global, pour qu'un jour modifié ne perde jamais son état
 * si l'éleveur quitte l'écran avant d'avoir tout revu.
 */
export default function VetAgendaScreen() {
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    getMySchedule().then(({ data }) => {
      setDays(data);
      setLoading(false);
    });
  }, []);

  const save = async (day: ScheduleDay) => {
    setSaving(day.dayOfWeek);
    try {
      const { data } = await setMyScheduleDay(day);
      setDays((prev) => prev.map((d) => (d.dayOfWeek === day.dayOfWeek ? data : d)));
    } catch {
      Alert.alert('Échec', "Impossible d'enregistrer ce jour. Réessayez.");
    } finally {
      setSaving(null);
    }
  };

  const toggle = (day: ScheduleDay) => {
    const next: ScheduleDay = day.open
      ? { ...day, open: false }
      : { ...day, open: true, startTime: day.startTime ?? '08:00', endTime: day.endTime ?? '17:00' };
    setDays((prev) => prev.map((d) => (d.dayOfWeek === day.dayOfWeek ? next : d)));
    save(next);
  };

  if (loading) return <Screen bg={colors.white}><TopBar title="Mon agenda" /><Text style={styles.loading}>Chargement…</Text></Screen>;

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Mon agenda" />
      <Text style={styles.intro}>
        Activez les jours où vous recevez des consultations, et précisez vos horaires.
      </Text>

      {days.map((day) => (
        <View key={day.dayOfWeek} style={styles.row}>
          <View style={styles.rowHead}>
            <Text style={styles.dayLabel}>{DAY_LABELS[day.dayOfWeek]}</Text>
            <Switch
              value={day.open}
              onValueChange={() => toggle(day)}
              trackColor={{ true: colors.green, false: colors.border }}
              disabled={saving === day.dayOfWeek}
            />
          </View>

          {day.open && (
            <View style={styles.times}>
              <View style={styles.timeField}>
                <Input
                  label="Début"
                  value={day.startTime ?? ''}
                  onChangeText={(v) => setDays((prev) => prev.map((d) => (d.dayOfWeek === day.dayOfWeek ? { ...d, startTime: v } : d)))}
                  onBlur={() => save(days.find((d) => d.dayOfWeek === day.dayOfWeek)!)}
                  placeholder="08:00"
                />
              </View>
              <View style={styles.timeField}>
                <Input
                  label="Fin"
                  value={day.endTime ?? ''}
                  onChangeText={(v) => setDays((prev) => prev.map((d) => (d.dayOfWeek === day.dayOfWeek ? { ...d, endTime: v } : d)))}
                  onBlur={() => save(days.find((d) => d.dayOfWeek === day.dayOfWeek)!)}
                  placeholder="17:00"
                />
              </View>
            </View>
          )}
        </View>
      ))}
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  intro: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginTop: spacing.md, marginBottom: spacing.lg, lineHeight: 19 },
  row: {
    backgroundColor: colors.bgBlue,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brown },
  times: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  timeField: { flex: 1 },
});
