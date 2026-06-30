import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, TopBar } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../theme';
import { getVet, type Vet } from '../../services/api';
import { initAppointmentPayment, checkPaymentStatus, METHOD_LABEL } from '../../services/payment';
import { usePaymentStore } from '../../store/usePaymentStore';
import { api } from '../../services/api';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'PaymentRecap'>;

export default function PaymentRecapScreen() {
  const nav = useNavigation<Nav>();
  const { vetId, amount, date, time, reason } = useRoute<Rt>().params;
  const [vet, setVet] = useState<Vet | null>(null);
  const [loading, setLoading] = useState(false);
  const { method, phone } = usePaymentStore();

  useEffect(() => {
    getVet(vetId).then((response) => setVet(response?.data ?? null));
  }, [vetId]);

  const onPay = async () => {
    try {
      setLoading(true);

      const startTime = time ? `${time}:00` : '10:00:00';
      const endTime = time ? `${time.split(':')[0]}:30:00` : '10:30:00';
      const startsAt = new Date(`${date}T${startTime}`).toISOString();
      const endsAt = new Date(`${date}T${endTime}`).toISOString();

      const appointmentRes = await api.post<{ success: boolean; data: { id: string } }>(
        '/appointments',
        {
          vetProfileId: vetId,
          startsAt,
          endsAt,
          reason: reason || 'Consultation',
          method: 'IN_PERSON',
        },
        true
      );

      if (!appointmentRes.data?.id) {
        throw new Error('Appointment creation failed');
      }

      const paymentRes = await initAppointmentPayment({
        appointmentId: appointmentRes.data.id,
        amount,
        method,
        phone,
      });

      if (!paymentRes.data?.paymentId) {
        throw new Error('Payment initiation failed');
      }

      let paymentSuccess = false;
      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const statusRes = await checkPaymentStatus(paymentRes.data.paymentId);
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
        date,
        time,
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
        <Row label="Date / Heure" value={`${date} / ${time}`} />
        <Row label="Durée" value="30 minutes" />
        <Row label="Raison" value={reason || 'Consultation'} />
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
        <Button title="Payer maintenant" variant="brown" loading={loading} onPress={onPay} />
      </View>
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
  footer: { padding: spacing.xl },
});
