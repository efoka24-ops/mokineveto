import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from './Screen';
import TopBar from './TopBar';
import { colors, fonts, spacing } from '../theme';

interface Props {
  title: string;
  hint?: string;
}

/** Écran temporaire en attendant l'implémentation finale du module. */
export default function Placeholder({ title, hint }: Props) {
  return (
    <Screen>
      <TopBar title={title} />
      <View style={styles.body}>
        <Ionicons name="construct-outline" size={48} color={colors.green} />
        <Text style={styles.text}>{hint ?? 'Écran en cours de construction'}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  text: { fontFamily: fonts.body, color: colors.grey },
});
