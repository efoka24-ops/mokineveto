import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'PaymentResult'>;

export default function PaymentResultScreen() {
  const nav = useNavigation<Nav>();
  const { success, vetName, date, time } = useRoute<Rt>().params;

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
  home: { fontFamily: fonts.bodySemiBold, color: colors.white, textAlign: 'center' },
});
