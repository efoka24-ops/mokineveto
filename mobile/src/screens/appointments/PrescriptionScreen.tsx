import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { getPrescription, createPrescription, type Prescription } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppointmentsStore } from '../../store/useAppointmentsStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Prescription'>;

interface DraftMed {
  name: string;
  dosage: string;
  route: string;
  duration: string;
}

const EMPTY_MED: DraftMed = { name: '', dosage: '', route: '', duration: '' };

/**
 * Prescription rattachée à un rendez-vous. Le vétérinaire la rédige une fois
 * la consultation terminée ; l'éleveur la consulte ensuite en lecture seule
 * et l'imprime (pas de bibliothèque PDF sur cet hébergement — l'impression
 * navigateur en tient lieu, ce que la PWA rend possible nativement).
 */
export default function PrescriptionScreen() {
  const nav = useNavigation<Nav>();
  const { appointmentId } = useRoute<Rt>().params;
  const role = useAuthStore((s) => s.user?.role);
  const appt = useAppointmentsStore((s) => s.items.find((a) => a.id === appointmentId));
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meds, setMeds] = useState<DraftMed[]>([{ ...EMPTY_MED }]);
  const [instructions, setInstructions] = useState('');

  const isVet = role === 'VETERINAIRE';

  useEffect(() => {
    getPrescription(appointmentId)
      .then((res) => setPrescription(res.data))
      .catch(() => setPrescription(null))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const updateMed = (i: number, patch: Partial<DraftMed>) => {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  };

  const submit = async () => {
    const valid = meds.filter((m) => m.name.trim() && m.dosage.trim());
    if (valid.length === 0) return;
    setSaving(true);
    try {
      const res = await createPrescription(appointmentId, {
        medications: valid.map((m) => ({ name: m.name, dosage: m.dosage, route: m.route || 'Non précisé', duration: m.duration || undefined })),
        instructions: instructions.trim() || undefined,
      });
      setPrescription(res.data);
    } catch (_err) {
      console.warn('[PrescriptionScreen] Failed to create prescription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <TopBar title="Prescription" />
        <Text style={styles.muted}>Chargement…</Text>
      </Screen>
    );
  }

  // Vétérinaire, consultation terminée, pas encore de prescription : formulaire.
  if (!prescription && isVet) {
    return (
      <Screen scroll footer={<Button title="Délivrer la prescription" loading={saving} onPress={submit} />}>
        <TopBar title="Rédiger une prescription" />
        {meds.map((m, i) => (
          <View key={i} style={styles.medCard}>
            <Text style={styles.medIndex}>Médicament {i + 1}</Text>
            <Input label="Nom" value={m.name} onChangeText={(v) => updateMed(i, { name: v })} />
            <Input label="Posologie" placeholder="Ex : 1ml/10kg" value={m.dosage} onChangeText={(v) => updateMed(i, { dosage: v })} />
            <Input label="Voie d'administration" placeholder="Ex : Injection IM" value={m.route} onChangeText={(v) => updateMed(i, { route: v })} />
            <Input label="Durée du traitement" placeholder="Ex : 3 jours" value={m.duration} onChangeText={(v) => updateMed(i, { duration: v })} />
          </View>
        ))}
        <Pressable style={styles.addMedBtn} onPress={() => setMeds((prev) => [...prev, { ...EMPTY_MED }])}>
          <Ionicons name="add-circle-outline" size={18} color={colors.green} />
          <Text style={styles.addMedText}>Ajouter un médicament</Text>
        </Pressable>
        <Input
          label="Instructions / guide de suivi"
          placeholder="Ex : injecter en profondeur, alterner les points, délai d'attente avant abattage…"
          multiline
          numberOfLines={4}
          value={instructions}
          onChangeText={setInstructions}
        />
        <View style={{ height: spacing.xxl }} />
      </Screen>
    );
  }

  if (!prescription) {
    return (
      <Screen>
        <TopBar title="Prescription" />
        <View style={styles.emptyBox}>
          <Ionicons name="document-text-outline" size={32} color={colors.greenSoft} />
          <Text style={styles.emptyText}>Aucune prescription pour cette consultation.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <TopBar title="Prescription" />
      <View style={styles.printCard}>
        <Text style={styles.printTitle}>Prescription vétérinaire</Text>
        <Text style={styles.printMeta}>
          Consultation du {appt ? `${appt.date} · ${appt.time}` : ''}
        </Text>
        {prescription.medications.map((m, i) => (
          <View key={i} style={styles.medRow}>
            <Text style={styles.medName}>{m.name}</Text>
            <Text style={styles.medDetail}>{m.dosage} · {m.route}{m.duration ? ` · ${m.duration}` : ''}</Text>
          </View>
        ))}
        {prescription.instructions ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.instructionsTitle}>Guide de suivi</Text>
            <Text style={styles.instructionsText}>{prescription.instructions}</Text>
          </View>
        ) : null}
      </View>

      {!isVet && (
        <Pressable style={styles.printBtn} onPress={() => (globalThis as any).print?.()}>
          <Ionicons name="print-outline" size={18} color={colors.white} />
          <Text style={styles.printBtnText}>Imprimer / Enregistrer en PDF</Text>
        </Pressable>
      )}
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  emptyBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxxl },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, textAlign: 'center' },
  medCard: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.soft },
  medIndex: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.green, marginBottom: spacing.sm },
  addMedBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', marginBottom: spacing.lg },
  addMedText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.green },
  printCard: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.xl, ...shadow.soft },
  printTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.brown, marginBottom: 4 },
  printMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginBottom: spacing.lg },
  medRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  medName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  medDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginTop: 2 },
  instructionsTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.green, marginBottom: 4 },
  instructionsText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.green, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg },
  printBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
});
