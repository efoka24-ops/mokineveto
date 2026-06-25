import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { usePaymentStore } from '../../store/usePaymentStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PaymentMethodsScreen() {
  const nav = useNavigation<Nav>();
  const setMethod = usePaymentStore((s) => s.setMethod);

  return (
    <Screen bg={colors.white}>
      <TopBar title="Mode De Paiement" tint={colors.green} />

      <Text style={styles.section}>Carte de crédit et de débit</Text>
      <Pressable
        style={styles.cardPill}
        onPress={() => {
          setMethod('CARD');
          nav.navigate('AddCard');
        }}
      >
        <Ionicons name="card-outline" size={20} color={colors.white} />
        <Text style={styles.cardPillText}>Ajouter une carte</Text>
      </Pressable>

      <Text style={styles.section}>Mobile Money</Text>
      <View style={styles.tiles}>
        <Pressable
          style={styles.tile}
          onPress={() => {
            setMethod('ORANGE_MONEY');
            nav.navigate('OrangeMoney');
          }}
        >
          <Text style={[styles.tileText, { color: colors.orange }]}>Orange{'\n'}Money</Text>
        </Pressable>
        <Pressable
          style={styles.tile}
          onPress={() => {
            setMethod('MTN_MOMO');
            nav.navigate('MtnMomo');
          }}
        >
          <Text style={[styles.tileText, { color: colors.mtn }]}>MTN{'\n'}MoMo</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.md },
  cardPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.tileBlack, borderRadius: radii.pill, paddingHorizontal: spacing.xl, height: 54 },
  cardPillText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.white },
  tiles: { flexDirection: 'row', gap: spacing.lg },
  tile: { width: 120, height: 96, borderRadius: radii.lg, backgroundColor: colors.tileBlack, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fonts.bodyBold, fontSize: 16, textAlign: 'center' },
});
