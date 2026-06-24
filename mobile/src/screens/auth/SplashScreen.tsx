import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Logo } from '../../components';
import { colors } from '../../theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Logo size={1.2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
