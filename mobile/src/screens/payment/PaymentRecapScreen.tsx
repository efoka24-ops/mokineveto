import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, TopBar } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../theme';
import { getVet, type Vet } from '../../services/vets';
import { pay, METHOD_LABEL } from '../../services/payment';
import { usePaymentStore } from '../../store/usePaymentStore';
import { useAppointmentsStore } from '../../store/useAppointmentsStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'PaymentRecap'>;

export default function PaymentRecapScreen() {
  const nav = useNavigation<Nav>();
  const { vetId, amount, slot } = useRoute<Rt>().params;
  const [vet, setVet] = useState<Vet | null>(null);
  const [loading, setLoading] = useState(false);
  const { method, phone } = usePaymentStore();
  const addAppointment = useAppointmentsStore((s) => s.add);

  useEffect(() => {
    getVet(vetId).then((v) => setVet(v ?? null));
  }, [vetId]);

  const [datePart, timePart] = (slot ?? 'Lun 24 · 10:00').split(' · ');

  const onPay = async () => {
    setLoading(true);
    const res = await pay({ amount, method, phone });
    setLoading(false);
    if (res.success) {
      addAppointment({
        id: res.reference,
        vetId,
        vetName: vet?.name ?? 'Vétérinaire',
        specialty: vet?.specialty ?? '',
        date: datePart ?? '',
        time: timePart ?? '',
        amount,
        reason: 'Consultation',
        method: METHOD_LABEL[method],
        status: 'UPCOMING',
      });
    }
    nav.navigate('PaymentResult', {
      success: res.success,
      vetName: vet?.name,
      date: datePart,
      time: timePart,
    });
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
        <Row label="Date / Heure" value={`${datePart} / ${timePart}`} />
        <Row label="Durée" value="1 heure" />
        <Row label="Réservation pour" value="Consultation" />
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
