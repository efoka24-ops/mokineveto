import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const nav = useNavigation<Nav>();
  const items: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => nav.navigate('NotificationSettings') },
    { icon: 'key-outline', label: 'Mots de passe', onPress: () => nav.navigate('ChangePassword') },
    { icon: 'person-remove-outline', label: 'Supprimer mon compte', onPress: () => {} },
  ];

  return (
    <Screen bg={colors.white}>
      <TopBar title="Paramètres" />
      {items.map((it) => (
        <Pressable key={it.label} style={styles.row} onPress={it.onPress}>
          <Ionicons name={it.icon} size={22} color={colors.green} />
          <Text style={styles.label}>{it.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.brown} />
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.brown },
});
