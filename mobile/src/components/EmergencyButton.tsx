import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radii, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Bouton d'urgence permanent (SFD §4.2).
 *
 * « Bouton Urgence visible en rouge sur tout écran : déclenche une demande de
 * consultation prioritaire. » Il est donc monté au-dessus de la navigation à
 * onglets plutôt que dans un écran, afin de rester atteignable sans navigation
 * préalable — c'est précisément sa raison d'être.
 *
 * Cible tactile de 56 dp, au-delà du minimum de 48 dp exigé par la SFD §8.2.
 */
export default function EmergencyButton() {
  const nav = useNavigation<Nav>();

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => nav.navigate('Emergency')}
        accessibilityRole="button"
        accessibilityLabel="Urgence : demander une consultation prioritaire"
        hitSlop={8}
      >
        <Ionicons name="warning" size={26} color={colors.white} />
        <Text style={styles.label}>Urgence</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: spacing.lg,
    // Au-dessus de la barre d'onglets, sans la masquer.
    bottom: 104,
  },
  button: {
    minWidth: 56,
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.white,
    marginTop: 1,
  },
});
