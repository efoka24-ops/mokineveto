import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

interface Props {
  onGoogle?: () => void;
  onFacebook?: () => void;
  onBiometric?: () => void;
  /** Masque Google/Facebook pour ne montrer que la biométrie (écran "Bienvenue"). */
  biometricOnly?: boolean;
}

/** Cercles verts de connexion sociale + biométrie (design Figma). */
export default function SocialRow({ onGoogle, onFacebook, onBiometric, biometricOnly }: Props) {
  return (
    <View style={styles.row}>
      {!biometricOnly && (
        <>
          <Pressable style={styles.circle} onPress={onGoogle}>
            <FontAwesome name="google" size={22} color={colors.white} />
          </Pressable>
          <Pressable style={styles.circle} onPress={onFacebook}>
            <FontAwesome name="facebook" size={22} color={colors.white} />
          </Pressable>
        </>
      )}
      <Pressable style={styles.circle} onPress={onBiometric}>
        <Ionicons name="finger-print" size={24} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
