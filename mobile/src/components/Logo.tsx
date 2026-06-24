import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../theme';

interface Props {
  size?: number;
  showTagline?: boolean;
}

/**
 * Logo MokineVet : pin brun avec feuille verte, mot "MOKINE" (brun) + "VET" (vert),
 * tagline "Remote Healthcare". Reproduction du logo Figma en composants natifs
 * (à remplacer par l'asset SVG/PNG officiel une fois fourni).
 */
export default function Logo({ size = 1, showTagline = true }: Props) {
  const word = 26 * size;
  return (
    <View style={styles.wrap}>
      <View style={[styles.pin, { width: 64 * size, height: 64 * size }]}>
        <MaterialCommunityIcons name="map-marker" size={64 * size} color={colors.brown} />
        <MaterialCommunityIcons
          name="leaf"
          size={26 * size}
          color={colors.green}
          style={styles.leaf}
        />
      </View>
      <View style={styles.row}>
        <Text style={[styles.word, { fontSize: word, color: colors.brown }]}>MOKINE</Text>
        <Text style={[styles.vet, { fontSize: word * 0.62, color: colors.green }]}>VET</Text>
      </View>
      {showTagline ? <Text style={styles.tagline}>Remote Healthcare</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pin: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  leaf: { position: 'absolute', top: '28%' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  word: { fontFamily: fonts.displayBold, letterSpacing: 0.5 },
  vet: { fontFamily: fonts.displayBold, marginBottom: 4, marginLeft: 2 },
  tagline: { fontFamily: fonts.body, fontSize: 11, color: colors.ink, marginTop: 2 },
});
