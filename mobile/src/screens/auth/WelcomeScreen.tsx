import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Logo, Screen, SocialRow } from '../../components';
import { colors, fonts, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WelcomeScreen() {
  const nav = useNavigation<Nav>();
  return (
    <Screen bg={colors.white} contentStyle={styles.content}>
      <View style={styles.top}>
        <Logo size={1.1} />
      </View>
      <View style={styles.bottom}>
        <Button title="Connexion" onPress={() => nav.navigate('Login')} />
        <SocialRow />
        <Text style={styles.signup}>
          Pas de compte ?{' '}
          <Text style={styles.link} onPress={() => nav.navigate('Signup')}>
            Inscrivez-vous
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { gap: spacing.xl, paddingBottom: spacing.xxl },
  signup: { textAlign: 'center', fontFamily: fonts.body, color: colors.ink },
  link: { fontFamily: fonts.bodySemiBold, color: colors.green },
});
