import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { usePaymentStore } from '../../store/usePaymentStore';

interface Props {
  title: string;
  brandColor: string;
  brandLabel: string;
}

const SAVED = ['237 6XX XX XX 01', '237 6XX XX XX 02', '237 6XX XX XX 03'];

export default function MobileMoneyForm({ title, brandColor, brandLabel }: Props) {
  const nav = useNavigation<any>();
  const setPhone = usePaymentStore((s) => s.setPhone);
  const [number, setNumber] = useState('');
  const [confirm, setConfirm] = useState('');
  const [selected, setSelected] = useState(0);

  const save = () => {
    setPhone(number || SAVED[selected]);
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

      <Text style={styles.savedLabel}>Numéros enregistrés</Text>
      {SAVED.map((s, i) => (
        <Pressable key={s} style={styles.savedRow} onPress={() => setSelected(i)}>
          <Text style={styles.savedText}>{s}</Text>
          <Ionicons name={i === selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.brown} />
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tile: { height: 120, borderRadius: radii.lg, backgroundColor: colors.tileBlack, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  tileText: { fontFamily: fonts.bodyBold, fontSize: 24 },
  savedLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink, marginTop: spacing.md, marginBottom: spacing.sm },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  savedText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
});
