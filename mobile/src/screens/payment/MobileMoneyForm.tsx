import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { usePaymentStore } from '../../store/usePaymentStore';

interface Props {
  title: string;
  brandColor: string;
  brandLabel: string;
}

export default function MobileMoneyForm({ title, brandColor, brandLabel }: Props) {
  const nav = useNavigation<any>();
  const { phone: savedPhone, setPhone } = usePaymentStore();
  const [number, setNumber] = useState(savedPhone);
  const [confirm, setConfirm] = useState(savedPhone);

  const save = () => {
    const digits = number.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 15) {
      Alert.alert('Numéro invalide', 'Saisissez un numéro Mobile Money valide (ex. 6 99 00 01 11).');
      return;
    }
    if (digits !== confirm.replace(/\D/g, '')) {
      Alert.alert('Numéros différents', 'Le numéro et sa confirmation doivent être identiques.');
      return;
    }
    setPhone(digits.length === 9 && digits.startsWith('6') ? `237${digits}` : digits);
    nav.goBack();
  };

  return (
    <Screen bg={colors.white} scroll footer={<Button title="Enregistrer" variant="brown" onPress={save} />}>
      <TopBar title={title} tint={colors.green} />

      <View style={[styles.tile, { borderColor: brandColor }]}>
        <Text style={[styles.tileText, { color: brandColor }]}>{brandLabel}</Text>
      </View>

      <Input label="Numéro" placeholder="000 000 000 00" keyboardType="phone-pad" value={number} onChangeText={setNumber} />
      <Input label="Confirmer le numéro" placeholder="000 000 000 00" keyboardType="phone-pad" value={confirm} onChangeText={setConfirm} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: { height: 120, borderRadius: radii.lg, backgroundColor: colors.tileBlack, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  tileText: { fontFamily: fonts.bodyBold, fontSize: 24 },
});
