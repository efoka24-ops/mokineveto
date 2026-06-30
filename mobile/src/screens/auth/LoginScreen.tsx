import React, { useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Screen, SocialRow, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import { signInWithPassword } from '../../services/auth';
import { useSecurityStore } from '../../store/useSecurityStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);

  const onLogin = async () => {
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      // RootNavigator switches to the Main stack reactively once the store's user is set.
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onBiometric = async () => {
    if (!biometricEnabled) {
      Alert.alert(
        'Biométrie non configurée',
        'Activez le déverrouillage biométrique dans Paramètres après votre première connexion.'
      );
      return;
    }
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Connexion biométrique',
      });
      if (res.success) {
        // Biometric only re-unlocks an existing local session; if none, prompt password.
        Alert.alert('Connexion', 'Veuillez vous connecter avec votre mot de passe la première fois.');
      }
    } catch (_err) {
      // ignore
    }
  };

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Connexion" />
      <View style={styles.form}>
        <Input
          placeholder="Entrez votre email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          placeholder="Entrez votre mot de passe"
          secure
          value={password}
          onChangeText={setPassword}
        />
        <Text style={styles.forgot} onPress={() => nav.navigate('ResetPassword')}>
          Mot de passe oublié
        </Text>

        <Button title="Connexion" onPress={onLogin} loading={loading} style={styles.cta} />

        <Text style={styles.or}>ou</Text>
        <SocialRow onBiometric={onBiometric} />

        <Text style={styles.signup}>
          Pas de compte ?{' '}
          <Text style={styles.link} onPress={() => nav.navigate('Signup')}>
            Inscrivez-vous
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.xxxl },
  forgot: {
    textAlign: 'right',
    fontFamily: fonts.bodyMedium,
    color: colors.green,
    marginTop: -spacing.sm,
    marginBottom: spacing.xl,
  },
  cta: { marginTop: spacing.lg },
  or: { textAlign: 'center', color: colors.grey, fontFamily: fonts.body, marginVertical: spacing.lg },
  signup: { textAlign: 'center', fontFamily: fonts.body, color: colors.ink, marginTop: spacing.xl },
  link: { fontFamily: fonts.bodySemiBold, color: colors.green },
});
