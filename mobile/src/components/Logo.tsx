import React from 'react';
import { StyleSheet, Image, View } from 'react-native';

interface Props {
  size?: number;
}

export default function Logo({ size = 1 }: Props) {
  const logoWidth = 350 * size;
  const logoHeight = 100 * size;

  return (
    <View style={styles.wrap}>
      <Image
        source={require('../../assets/mokinevet-official.svg')}
        style={[styles.logo, { width: logoWidth, height: logoHeight }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 350, height: 100 },
});
