import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';

export default function ChangePasswordScreen() {
  const nav = useNavigation<any>();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Changer Mot De Passe" />
      <View style={styles.form}>
        <Input label="Saisir Mot De Passe" placeholder="••••••••" secure value={current} onChangeText={setCurrent} />
        <Text style={styles.forgot} onPress={() => nav.navigate('ResetPassword')}>
          Mot De Passe Oublier?
        </Text>
        <Input label="Nouveau Mot De Passe" placeholder="••••••••" secure value={next} onChangeText={setNext} />
        <Input label="Confirmer Mot De Passe" placeholder="••••••••" secure value={confirm} onChangeText={setConfirm} />
        <Button title="Changer Mot De Passe" onPress={() => nav.goBack()} style={styles.cta} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.lg },
  forgot: {
    textAlign: 'right',
    fontFamily: fonts.bodyMedium,
    color: colors.green,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  cta: { marginTop: spacing.xxl },
});
