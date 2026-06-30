import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { useSecurityStore } from '../../store/useSecurityStore';

export default function PinSetupScreen() {
  const nav = useNavigation<any>();
  const setPin = useSecurityStore((s) => s.setPin);
  const [pin, setPinValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (pin.length < 4) {
      setError('Le PIN doit comporter au moins 4 chiffres.');
      return;
    }
    if (pin !== confirm) {
      setError('Les deux PIN ne correspondent pas.');
      return;
    }
    await setPin(pin);
    nav.goBack();
  };

  return (
    <Screen footer={<Button title="Enregistrer le PIN" onPress={save} />}>
      <TopBar title="Définir un code PIN" tint={colors.green} />
      <Text style={styles.intro}>
        Protégez l'accès à l'application avec un code PIN. Il vous sera demandé à l'ouverture.
      </Text>

      <Text style={styles.label}>Nouveau PIN</Text>
      <TextInput
        value={pin}
        onChangeText={setPinValue}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        style={styles.input}
        placeholder="••••"
        placeholderTextColor={colors.grey}
      />

      <Text style={styles.label}>Confirmer le PIN</Text>
      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        style={styles.input}
        placeholder="••••"
        placeholderTextColor={colors.grey}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginBottom: spacing.xl },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.green, marginBottom: spacing.sm },
  input: { backgroundColor: colors.greenPale, borderRadius: radii.md, padding: spacing.lg, fontSize: 24, letterSpacing: 8, textAlign: 'center', fontFamily: fonts.bodyBold, color: colors.ink, marginBottom: spacing.lg },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.danger, textAlign: 'center' },
});
