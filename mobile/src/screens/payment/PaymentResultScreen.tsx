import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { buildReceiptHtml, buildTicketHtml, exportPdf } from '../../services/documents';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'PaymentResult'>;

export default function PaymentResultScreen() {
  const nav = useNavigation<Nav>();
  const params = useRoute<Rt>().params;
  const { success, vetName, date, time } = params;
  const [busy, setBusy] = useState<'receipt' | 'ticket' | null>(null);

  const download = async (kind: 'receipt' | 'ticket') => {
    setBusy(kind);
    try {
      if (kind === 'receipt') {
        await exportPdf(buildReceiptHtml(params), 'Recu-MokineVeto.pdf');
      } else {
        await exportPdf(buildTicketHtml(params), 'Billet-rendez-vous-MokineVeto.pdf');
      }
    } catch (err) {
      Alert.alert('Téléchargement impossible', err instanceof Error ? err.message : 'Réessayez dans un instant.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.green }]}>
      <View style={styles.body}>
        <View style={styles.circle}>
          <Ionicons name={success ? 'checkmark' : 'close'} size={64} color={colors.green} />
        </View>
        <Text style={styles.title}>{success ? 'Félicitation' : 'Échec'}</Text>
        <Text style={styles.subtitle}>
          {success ? 'Le paiement est réussi' : "Le paiement n'est pas réussi"}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLead}>
            {success ? 'Vous avez pris rendez-vous avec succès avec' : 'Impossible de prendre rendez-vous avec'}
          </Text>
          <Text style={styles.cardVet}>{vetName ?? 'le vétérinaire'}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.white} />
              <Text style={styles.metaText}>{date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.white} />
              <Text style={styles.metaText}>{time}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {success ? (
          <View style={styles.docs}>
            <Pressable style={styles.docBtn} onPress={() => download('receipt')} disabled={busy !== null}>
              <Ionicons name="receipt-outline" size={18} color={colors.white} />
              <Text style={styles.docText}>{busy === 'receipt' ? 'Préparation…' : 'Reçu de paiement (PDF)'}</Text>
            </Pressable>
            <Pressable style={styles.docBtn} onPress={() => download('ticket')} disabled={busy !== null}>
              <Ionicons name="ticket-outline" size={18} color={colors.white} />
              <Text style={styles.docText}>{busy === 'ticket' ? 'Préparation…' : 'Billet de rendez-vous (PDF)'}</Text>
            </Pressable>
          </View>
        ) : null}
        {success ? (
          <Button
            title="Voir mes rendez-vous"
            variant="brown"
            onPress={() => nav.navigate('Main', { screen: 'Agenda' })}
          />
        ) : (
          <Button title="Réessayer" variant="brown" onPress={() => nav.goBack()} />
        )}
        <Text style={styles.home} onPress={() => nav.navigate('Main', { screen: 'Home' })}>
          Retour à l'accueil
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  circle: { width: 130, height: 130, borderRadius: 65, borderWidth: 6, borderColor: colors.white, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: colors.white },
  subtitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.white, marginBottom: spacing.xxl },
  card: { borderWidth: 1, borderColor: '#ffffff66', borderRadius: radii.lg, padding: spacing.xl, width: '100%', alignItems: 'center', gap: spacing.sm },
  cardLead: { fontFamily: fonts.body, fontSize: 13, color: '#ffffffcc', textAlign: 'center' },
  cardVet: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.white },
  cardMeta: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.body, fontSize: 13, color: colors.white },
  footer: { padding: spacing.xl, gap: spacing.md },
  docs: { gap: spacing.sm },
  docBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: '#ffffffaa', borderRadius: radii.md, paddingVertical: spacing.md },
  docText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
  home: { fontFamily: fonts.bodySemiBold, color: colors.white, textAlign: 'center' },
});
