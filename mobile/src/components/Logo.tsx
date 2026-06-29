import React from 'react';
import { StyleSheet, Image, View } from 'react-native';
import { MOKINEVETO_LOGO } from '../../assets/logo-uri';

interface Props {
  size?: number;
  showTagline?: boolean;
}

/**
 * Logo MokineVET - Official branding with real PNG asset
 * Pin marron + Feuille verte + Globe avec "MOKINE" (marron) + "VET" (vert)
 * Tagline: "Remote Healthcare"
 */
export default function Logo({ size = 1 }: Props) {
  const logoWidth = 280 * size;
  const logoHeight = 80 * size;

  return (
    <View style={styles.wrap}>
      <Image
        source={MOKINEVETO_LOGO}
        style={[styles.logo, { width: logoWidth, height: logoHeight }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 280, height: 80 },
});
