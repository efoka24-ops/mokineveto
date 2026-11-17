import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, TopBar } from '../../components';
import { useAuthStore } from '../../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../theme';
import { getVet, createAppointment, toUserMessage, type Vet, type ConsultationType } from '../../services/api';
import { initAppointmentPayment, checkPaymentStatus, METHOD_LABEL } from '../../services/payment';
import { usePaymentStore } from '../../store/usePaymentStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'PaymentRecap'>;

const TYPE_LABEL: Record<ConsultationType, string> = { CALL: 'Appel', VIDEO: 'Vidéo', FIELD: 'Terrain' };

/** Numéro mobile money au format international sans « + » (ex. 237699000111). */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Numéro local camerounais à 9 chiffres (6XXXXXXXX) : on ajoute l'indicatif.
  return digits.length === 9 && digits.startsWith('6') ? `237${digits}` : digits;
}

export default function PaymentRecapScreen() {
  const nav = useNavigation<Nav>();
  const { vetId, amount, consultationType, farmId, distanceKm, date, time, reason } = useRoute<Rt>().params;
  const [vet, setVet] = useState<Vet | null>(null);
  const [loading, setLoading] = useState(false);
  const { method, phone: savedPhone, setMethod, setPhone } = usePaymentStore();
  const accountPhone = useAuthStore((s) => s.user?.phone ?? '');
  const [payOpen, setPayOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    getVet(vetId).then((response) => setVet(response?.data ?? null));
  }, [vetId]);

  // Le popup s'ouvre au clic sur « Payer » : numéro pré-rempli avec le dernier
  // utilisé, sinon celui du compte — l'éleveur le corrige si son Mobile Money
  // est sur une autre ligne.
  const openPay = () => {
    setPhoneInput(savedPhone || accountPhone);
    setPhoneError('');
    setPayOpen(true);
  };

  const confirmPay = () => {
    const normalized = normalizePhone(phoneInput);
    if (normalized.length < 9 || normalized.length > 15) {
      setPhoneError('Numéro invalide. Exemple : 6 99 00 01 11 ou 237 699 000 111.');
      return;
    }
    setPhone(normalized);
    setPayOpen(false);
    onPay(normalized);
  };

  const onPay = async (payPhone: string) => {
    try {
      setLoading(true);

      const startTime = time ? `${time}:00` : '10:00:00';
      const startsAt = new Date(`${date}T${startTime}`).toISOString();

      let appointmentRes;
      try {
        appointmentRes = await createAppointment({
          vetId,
          startsAt,
          reason: reason || 'Consultation',
          method,
          consultationType,
          farmId,
        });
      } catch (err) {
        // Refus de réservation (créneau pris, praticien indisponible…) : rien
        // n'a été débité, donc on explique et on revient au choix du créneau
        // au lieu d'afficher un faux « échec de paiement ».
        Alert.alert('Réservation impossible', toUserMessage(err), [{ text: 'Choisir un autre créneau', onPress: () => nav.goBack() }]);
        return;
      }

      const appointmentId = appointmentRes.data?.id;
      const realAmount = appointmentRes.data?.amount ?? amount;
      if (!appointmentId) {
        throw new Error('Appointment creation failed');
      }

      const paymentRes = await initAppointmentPayment({
        appointmentId,
        amount: realAmount,
        method,
        phone: payPhone,
      });

      if (!paymentRes.paymentId) {
        throw new Error('Payment initiation failed');
      }

      // Le paiement Mobile Money est validé par l'éleveur sur son téléphone
      // (confirmation USSD) : on laisse jusqu'à ~2 min avant de conclure.
      let paymentSuccess = false;
      for (let i = 0; i < 80; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const statusRes = await checkPaymentStatus(paymentRes.paymentId);
        if (statusRes.data?.status === 'SUCCEEDED') {
          paymentSuccess = true;
          break;
        }
        if (statusRes.data?.status === 'FAILED') {
          break;
        }
      }

      nav.navigate('PaymentResult', {
        success: paymentSuccess,
        vetName: vet?.name,
        vetSpecialty: vet?.specialty,
        date,
        time,
        appointmentId,
        paymentId: paymentRes.paymentId,
        reference: paymentRes.reference,
        amount: realAmount,
        method,
        phone: payPhone,
        consultationType,
        reason,
      });
    } catch (_err) {
      console.error('[PaymentRecapScreen] Payment error:', _err);
      nav.navigate('PaymentResult', {
        success: false,
        vetName: vet?.name,
        date,
        time,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <TopBar title="Paiement" tint={colors.white} />
        <Text style={styles.amount}>{amount.toLocaleString('fr-FR')} XAF</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.vetRow}>
          {vet ? <Image source={{ uri: vet.photo }} style={styles.avatar} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.vetName}>{vet?.name}</Text>
            <Text style={styles.specialty}>{vet?.specialty}</Text>
          </View>
        </View>

        <View style={styles.divider} />
        <Row label="Type" value={TYPE_LABEL[consultationType]} />
        <Row label="Date / Heure" value={`${date} / ${time}`} />
        <Row label="Durée" value="30 minutes" />
        <Row label="Raison" value={reason || 'Consultation'} />
        {consultationType === 'FIELD' && distanceKm ? <Row label="Distance" value={`${distanceKm} km`} /> : null}
        <View style={styles.divider} />
        <Row label="Montant" value={`${amount.toLocaleString('fr-FR')} XAF`} />
        <Row label="Total" value={`${amount.toLocaleString('fr-FR')} XAF`} bold />
        <View style={styles.divider} />

        <Pressable style={styles.methodRow} onPress={() => nav.navigate('PaymentMethods')}>
          <Text style={styles.methodLabel}>Mode de paiement</Text>
          <View style={styles.methodValue}>
            <Text style={styles.methodText}>{METHOD_LABEL[method]}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.grey} />
          </View>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Payer maintenant" variant="brown" loading={loading} onPress={openPay} />
        {loading ? (
          <Text style={styles.waitHint}>
            Validez le paiement sur votre téléphone (code USSD), puis patientez quelques instants…
          </Text>
        ) : null}
      </View>

      <Modal visible={payOpen} transparent animationType="slide" onRequestClose={() => setPayOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPayOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Paiement Mobile Money</Text>
          <Text style={styles.sheetAmount}>{amount.toLocaleString('fr-FR')} XAF</Text>

          <View style={styles.methodChips}>
            {(['ORANGE_MONEY', 'MTN_MOMO'] as const).map((m) => (
              <Pressable
                key={m}
                style={[styles.methodChip, method === m && styles.methodChipActive]}
                onPress={() => setMethod(m)}
              >
                <Text style={[styles.methodChipText, method === m && styles.methodChipTextActive]}>
                  {METHOD_LABEL[m]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Input
            label="Numéro à débiter"
            placeholder="6 99 00 01 11"
            keyboardType="phone-pad"
            value={phoneInput}
            onChangeText={(v) => {
              setPhoneInput(v);
              setPhoneError('');
            }}
          />
          {phoneError ? <Text style={styles.sheetError}>{phoneError}</Text> : null}
          <Text style={styles.sheetHint}>
            Vous recevrez une demande de confirmation sur ce numéro. Aucun montant n'est débité sans votre validation.
          </Text>

          <Button title="Confirmer et payer" variant="brown" onPress={confirmPay} />
          <Text style={styles.sheetCancel} onPress={() => setPayOpen(false)}>Annuler</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontFamily: fonts.bodyBold }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  head: { backgroundColor: colors.green, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  amount: { fontFamily: fonts.displayBold, fontSize: 38, color: colors.white, textAlign: 'center', marginTop: spacing.sm },
  body: { padding: spacing.xl },
  vetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  vetName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.green },
  specialty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.brown },
  rowValue: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  methodLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.green },
  methodValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  methodText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink },
  footer: { padding: spacing.xl, gap: spacing.sm },
  waitHint: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl, gap: spacing.sm },
  sheetTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.brown, textAlign: 'center' },
  sheetAmount: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.green, textAlign: 'center', marginBottom: spacing.sm },
  methodChips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  methodChip: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.greenPale, alignItems: 'center' },
  methodChipActive: { backgroundColor: colors.greenDark },
  methodChipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.greenDark },
  methodChipTextActive: { color: colors.white },
  sheetError: { fontFamily: fonts.body, fontSize: 12, color: colors.danger },
  sheetHint: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginBottom: spacing.sm },
  sheetCancel: { fontFamily: fonts.bodySemiBold, color: colors.grey, textAlign: 'center', paddingVertical: spacing.sm },
});
