import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { buildTicketHtml, exportPdf } from '../../services/documents';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { useAppointmentsStore } from '../../store/useAppointmentsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { completeAppointment } from '../../services/api';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'AppointmentDetail'>;

export default function AppointmentDetailScreen() {
  const nav = useNavigation<Nav>();
  const { id } = useRoute<Rt>().params;
  const appt = useAppointmentsStore((s) => s.items.find((a) => a.id === id));
  const reloadAppointments = useAppointmentsStore((s) => s.load);
  const role = useAuthStore((s) => s.user?.role);
  const [loading, setLoading] = useState(false);

  const isVet = role === 'VETERINAIRE';

  // Partage simple par lien wa.me : pré-remplit un message, sans session
  // WhatsApp maintenue côté serveur ni API Business — juste un lien.
  const shareOnWhatsApp = () => {
    if (!appt) return;
    const who = isVet ? appt.eleveurName ?? 'Éleveur' : appt.vetName;
    const text = [
      `Rendez-vous MokineVeto avec ${who}`,
      `${appt.date} à ${appt.time}`,
      `Motif : ${appt.reason}`,
      `Montant : ${appt.amount.toLocaleString('fr-FR')} XAF`,
    ].join('\n');
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`).catch(() => {});
  };

  if (!appt) {
    return (
      <Screen>
        <TopBar title="Rendez-vous" tint={colors.blue} />
        <Text style={styles.muted}>Rendez-vous introuvable.</Text>
      </Screen>
    );
  }

  const onComplete = async () => {
    try {
      setLoading(true);
      await completeAppointment(id);
      await reloadAppointments();
    } catch (_err) {
      console.warn('[AppointmentDetailScreen] Failed to complete');
    } finally {
      setLoading(false);
    }
  };

  const footer = (() => {
    if (appt.status === 'UPCOMING' && isVet) {
      return <Button title="Marquer comme terminé" loading={loading} onPress={onComplete} />;
    }
    if (appt.status === 'UPCOMING') {
      return (
        <Button
          title="Annuler le rendez-vous"
          variant="blue"
          onPress={() => nav.navigate('CancelAppointment', { id })}
        />
      );
    }
    if (appt.status === 'COMPLETED' && !isVet && !appt.hasReview) {
      return (
        <Button
          title="Laisser un avis"
          onPress={() => nav.navigate('Review', { appointmentId: id, vetId: appt.vetId })}
        />
      );
    }
    return undefined;
  })();

  const TYPE_LABEL: Record<string, string> = { CALL: 'Appel', VIDEO: 'Vidéo', FIELD: 'Terrain' };

  return (
    <Screen footer={footer}>
      <TopBar title="Rendez-vous" tint={colors.blue} />
      <View style={styles.header}>
        <Text style={styles.vetName}>{isVet ? appt.eleveurName ?? 'Éleveur' : appt.vetName}</Text>
        <Text style={styles.specialty}>{isVet ? appt.eleveurPhone ?? '' : appt.specialty}</Text>
      </View>

      <View style={styles.card}>
        <Row icon="calendar-outline" label="Date" value={appt.date} />
        <Row icon="time-outline" label="Heure" value={appt.time} />
        <Row icon="paw-outline" label="Réservation pour" value={appt.reason} />
        <Row icon="pricetag-outline" label="Type" value={TYPE_LABEL[appt.consultationType] ?? appt.consultationType} />
        <Row icon="cash-outline" label="Montant" value={`${appt.amount.toLocaleString('fr-FR')} FCFA`} />
        {appt.method ? <Row icon="card-outline" label="Paiement" value={appt.method} /> : null}
      </View>

      {appt.status === 'COMPLETED' && (
        <Pressable
          style={styles.rxBtn}
          onPress={() => nav.navigate('Prescription', { appointmentId: id })}
          accessibilityRole="button"
        >
          <Ionicons name="document-text-outline" size={18} color={colors.white} />
          <Text style={styles.rxText}>{isVet ? 'Prescription' : 'Voir la prescription'}</Text>
        </Pressable>
      )}

      {!isVet && appt.status !== 'CANCELLED' && (
        <Pressable
          style={styles.rxBtn}
          accessibilityRole="button"
          onPress={() =>
            exportPdf(
              buildTicketHtml({
                vetName: appt.vetName,
                vetSpecialty: appt.specialty,
                date: appt.date,
                time: appt.time,
                consultationType: appt.consultationType as 'CALL' | 'VIDEO' | 'FIELD',
                reason: appt.reason,
                appointmentId: appt.id,
              }),
              'Billet-rendez-vous-MokineVeto.pdf'
            ).catch((err) =>
              Alert.alert('Téléchargement impossible', err instanceof Error ? err.message : 'Réessayez dans un instant.')
            )
          }
        >
          <Ionicons name="ticket-outline" size={18} color={colors.white} />
          <Text style={styles.rxText}>Billet de rendez-vous (PDF)</Text>
        </Pressable>
      )}

      <Pressable style={styles.waBtn} onPress={shareOnWhatsApp} accessibilityRole="button">
        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
        <Text style={styles.waText}>Partager par WhatsApp</Text>
      </Pressable>
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
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md },
  waText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#25D366' },
  rxBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.green, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg },
  rxText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.white },
});
