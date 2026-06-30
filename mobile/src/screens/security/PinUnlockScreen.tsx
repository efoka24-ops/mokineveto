import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Screen } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { useSecurityStore } from '../../store/useSecurityStore';

/**
 * Écran de déverrouillage. Appelle onUnlock() une fois le PIN/biométrie validé.
 * Utilisé comme gate au démarrage de l'app si un PIN est configuré.
 */
export default function PinUnlockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { verifyPin, biometricEnabled } = useSecurityStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tryBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) return;

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Déverrouiller MokineVeto',
        fallbackLabel: 'Utiliser le PIN',
      });
      if (res.success) onUnlock();
    } catch (_err) {
      // fall back to PIN entry
    }
  };

  useEffect(() => {
    if (biometricEnabled) tryBiometric();
  }, [biometricEnabled]);

  const submit = async () => {
    const ok = await verifyPin(pin);
    if (ok) {
      onUnlock();
    } else {
      setError('Code PIN incorrect.');
      setPin('');
    }
  };

  return (
    <Screen bg={colors.white}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={40} color={colors.white} />
        </View>
        <Text style={styles.title}>Application verrouillée</Text>
        <Text style={styles.subtitle}>Entrez votre code PIN pour continuer</Text>

        <TextInput
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          autoFocus
          onSubmitEditing={submit}
          style={styles.input}
          placeholder="••••"
          placeholderTextColor={colors.grey}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={submit} style={styles.unlockBtn}>
          <Text style={styles.unlockText}>Déverrouiller</Text>
        </Pressable>

        {biometricEnabled ? (
          <Pressable onPress={tryBiometric} style={styles.bioBtn}>
            <Ionicons name="finger-print" size={22} color={colors.green} />
            <Text style={styles.bioText}>Utiliser la biométrie</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.brown },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.grey, marginBottom: spacing.lg },
  input: { backgroundColor: colors.greenPale, borderRadius: radii.md, padding: spacing.lg, fontSize: 28, letterSpacing: 10, textAlign: 'center', fontFamily: fonts.bodyBold, color: colors.ink, width: 200 },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.danger },
  unlockBtn: { backgroundColor: colors.green, borderRadius: radii.pill, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, marginTop: spacing.md },
  unlockText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  bioBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  bioText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.green },
});
