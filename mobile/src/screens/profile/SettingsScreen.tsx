import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, Select } from '../../components';
import { colors, fonts, spacing } from '../../theme';
import { LANGUAGES, setLanguage, type LangCode } from '../../i18n';
import { useSecurityStore } from '../../store/useSecurityStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const nav = useNavigation<Nav>();
  const { t, i18n } = useTranslation();
  const { hasPin, biometricEnabled, hydrate, clearPin, setBiometric } = useSecurityStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) return;
    }
    await setBiometric(value);
  };

  const items: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'notifications-outline', label: t('settings.notifications'), onPress: () => nav.navigate('NotificationSettings') },
    { icon: 'key-outline', label: t('settings.passwords'), onPress: () => nav.navigate('ChangePassword') },
    { icon: 'person-remove-outline', label: t('settings.deleteAccount'), onPress: () => {} },
  ];

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title={t('settings.title')} />

      <Select
        label={t('profile.language')}
        value={i18n.language as LangCode}
        options={LANGUAGES.map((l) => ({ label: l.label, value: l.code }))}
        onChange={(code) => setLanguage(code as LangCode)}
      />

      {items.map((it) => (
        <Pressable key={it.label} style={styles.row} onPress={it.onPress}>
          <Ionicons name={it.icon} size={22} color={colors.green} />
          <Text style={styles.label}>{it.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.brown} />
        </Pressable>
      ))}

      <Text style={styles.section}>Sécurité</Text>

      <Pressable style={styles.row} onPress={() => (hasPin ? clearPin() : nav.navigate('PinSetup'))}>
        <Ionicons name="lock-closed-outline" size={22} color={colors.green} />
        <Text style={styles.label}>{hasPin ? 'Désactiver le code PIN' : 'Définir un code PIN'}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.brown} />
      </Pressable>

      <View style={styles.row}>
        <Ionicons name="finger-print-outline" size={22} color={colors.green} />
        <Text style={styles.label}>Déverrouillage biométrique</Text>
        <Switch value={biometricEnabled} onValueChange={toggleBiometric} disabled={!hasPin} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.brown },
  section: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.green, marginTop: spacing.xl, marginBottom: spacing.sm },
});
