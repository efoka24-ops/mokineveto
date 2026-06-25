import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Screen, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';

const OPTIONS = [
  'Notification générale',
  'Son',
  'Son appel',
  'Vibreur',
  'Offres spéciales',
  'Paiements',
  'Promo et discount',
  'Cashback',
];

export default function NotificationSettingsScreen() {
  const [state, setState] = useState<boolean[]>([true, true, true, false, false, true, false, true]);
  const toggle = (i: number) => setState((s) => s.map((v, idx) => (idx === i ? !v : v)));

  return (
    <Screen bg={colors.white}>
      <TopBar title="Paramètres Notification" />
      {OPTIONS.map((o, i) => (
        <View key={o} style={styles.row}>
          <Text style={styles.label}>{o}</Text>
          <Switch
            value={state[i]}
            onValueChange={() => toggle(i)}
            trackColor={{ true: colors.green, false: colors.greenPale }}
            thumbColor={colors.white}
          />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg },
  label: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.brown },
});
