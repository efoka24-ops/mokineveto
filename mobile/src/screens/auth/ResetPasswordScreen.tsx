import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';

export default function ResetPasswordScreen() {
  const nav = useNavigation<any>();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Réinitialiser" />
      <Text style={styles.intro}>
        Saisissez votre nouveau mot de passe pour réinitialiser l'accès à votre compte.
      </Text>
      <View style={styles.form}>
        <Input label="Mot De Passe" placeholder="••••••••" secure value={pwd} onChangeText={setPwd} />
        <Input label="Confirmer Le Mot De Passe" placeholder="••••••••" secure value={confirm} onChangeText={setConfirm} />
        <Button title="Nouveau Mot De Passe" onPress={() => nav.goBack()} style={styles.cta} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.body, color: colors.grey, marginBottom: spacing.xl },
  form: { marginTop: spacing.sm },
  cta: { marginTop: spacing.lg },
});
