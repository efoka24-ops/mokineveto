import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';

export default function AddCardScreen() {
  const nav = useNavigation<any>();
  const [holder, setHolder] = useState('Hervé Tatinou');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  return (
    <Screen bg={colors.white} scroll footer={<Button title="Enregistrer" variant="brown" onPress={() => nav.goBack()} />}>
      <TopBar title="Carte Visa" tint={colors.green} />

      {/* Card preview */}
      <View style={styles.card}>
        <Text style={styles.cardNumber}>{number || '0000 0000 0000'}</Text>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.cardCap}>Titulaire</Text>
            <Text style={styles.cardVal}>{holder || '—'}</Text>
          </View>
          <View>
            <Text style={styles.cardCap}>Expire</Text>
            <Text style={styles.cardVal}>{expiry || '04/28'}</Text>
          </View>
        </View>
      </View>

      <Input label="Nom du titulaire de la carte" value={holder} onChangeText={setHolder} />
      <Input label="Numéro de carte" keyboardType="number-pad" placeholder="0000 0000 0000" value={number} onChangeText={setNumber} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Input label="Date d'expiration" placeholder="04/28" value={expiry} onChangeText={setExpiry} />
        </View>
        <View style={{ width: spacing.lg }} />
        <View style={{ flex: 1 }}>
          <Input label="CVV" placeholder="000" keyboardType="number-pad" secureTextEntry value={cvv} onChangeText={setCvv} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { height: 180, borderRadius: radii.lg, backgroundColor: colors.green, padding: spacing.xl, justifyContent: 'flex-end', marginBottom: spacing.xl, overflow: 'hidden' },
  cardNumber: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.white, letterSpacing: 2, marginBottom: spacing.xl },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardCap: { fontFamily: fonts.body, fontSize: 10, color: '#ffffffcc' },
  cardVal: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.white },
  row: { flexDirection: 'row' },
});
