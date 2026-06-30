import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { useAppointmentsStore } from '../../store/useAppointmentsStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'AppointmentDetail'>;

export default function AppointmentDetailScreen() {
  const nav = useNavigation<Nav>();
  const { id } = useRoute<Rt>().params;
  const appt = useAppointmentsStore((s) => s.items.find((a) => a.id === id));

  if (!appt) {
    return (
      <Screen>
        <TopBar title="Rendez-vous" tint={colors.blue} />
        <Text style={styles.muted}>Rendez-vous introuvable.</Text>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        appt.status === 'UPCOMING' ? (
          <Button title="Annuler le rendez-vous" variant="blue" onPress={() => nav.navigate('CancelAppointment', { id })} />
        ) : appt.status === 'COMPLETED' ? (
          <Button title="Laisser un avis" onPress={() => nav.navigate('Review', { appointmentId: id, vetId: appt.vetId })} />
        ) : undefined
      }
    >
      <TopBar title="Rendez-vous" tint={colors.blue} />
      <View style={styles.header}>
        <Text style={styles.vetName}>{appt.vetName}</Text>
        <Text style={styles.specialty}>{appt.specialty}</Text>
      </View>

      <View style={styles.card}>
        <Row icon="calendar-outline" label="Date" value={appt.date} />
        <Row icon="time-outline" label="Heure" value={appt.time} />
        <Row icon="paw-outline" label="Réservation pour" value={appt.reason} />
        <Row icon="cash-outline" label="Montant" value={`${appt.amount.toLocaleString('fr-FR')} XAF`} />
        {appt.method ? <Row icon="card-outline" label="Paiement" value={appt.method} /> : null}
      </View>
    </Screen>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={colors.blue} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xxl },
  header: { alignItems: 'center', marginVertical: spacing.lg },
  vetName: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.blue },
  specialty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.grey },
  rowValue: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink },
});
