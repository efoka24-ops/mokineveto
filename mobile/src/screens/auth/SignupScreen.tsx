import React, { useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Screen, Select, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { Role } from '../../store/useAuthStore';
import { signUp } from '../../services/auth';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SignupScreen() {
  const nav = useNavigation<Nav>();
  const [form, setForm] = useState({
    name: '',
    password: '',
    email: '',
    phone: '',
    birthDate: '',
  });
  const [role, setRole] = useState<Role>('ELEVEUR');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    setLoading(true);
    try {
      await signUp({ ...form, role });
      nav.replace('App');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Nouveau Compte" />
      <View style={styles.form}>
        <Input label="Nom" placeholder="Votre nom complet" value={form.name} onChangeText={set('name')} />
        <Input label="Mot De Passe" placeholder="••••••••" secure value={form.password} onChangeText={set('password')} />
        <Input
          label="Email"
          placeholder="example@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.email}
          onChangeText={set('email')}
        />
        <Input
          label="Numéro"
          placeholder="+237 6 00 00 00 00"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={set('phone')}
        />
        <Select
          label="Utilisateur"
          value={role}
          onChange={setRole}
          options={[
            { label: 'Éleveur', value: 'ELEVEUR' },
            { label: 'Vétérinaire', value: 'VETERINAIRE' },
          ]}
        />
        <Input
          label="Date De Naissance"
          placeholder="DD / MM / YYYY"
          value={form.birthDate}
          onChangeText={set('birthDate')}
        />

        <Button title="S'inscrire" onPress={onSubmit} loading={loading} style={styles.cta} />
        <Text style={styles.or}>ou inscrivez-vous avec</Text>
        <Text style={styles.signin}>
          Vous avez déjà un compte ?{' '}
          <Text style={styles.link} onPress={() => nav.navigate('Login')}>
            Connectez-vous
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.lg },
  cta: { marginTop: spacing.lg },
  or: { textAlign: 'center', color: colors.grey, fontFamily: fonts.body, marginVertical: spacing.lg },
  signin: { textAlign: 'center', fontFamily: fonts.body, color: colors.ink },
  link: { fontFamily: fonts.bodySemiBold, color: colors.green },
});
