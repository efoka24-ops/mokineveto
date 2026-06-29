import React from 'react';
import { StyleSheet, Image, View } from 'react-native';

interface Props {
  size?: number;
  showTagline?: boolean;
}

/**
 * Logo MokineVET - Official branding
 * Pin brun avec feuille verte, "MOKINE" (brun) + "VET" (vert), tagline "Remote Healthcare"
 */
export default function Logo({ size = 1 }: Props) {
  const logoWidth = 280 * size;
  const logoHeight = 80 * size;

  return (
    <View style={styles.wrap}>
      <Image
        source={require('../../assets/mokineveto-logo.svg')}
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
