import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { useAppointmentsStore } from '../../store/useAppointmentsStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'CancelAppointment'>;

const REASONS = ['Reprogrammation', 'Conditions météo', 'Imprévu', 'Autre'];

export default function CancelAppointmentScreen() {
  const nav = useNavigation<Nav>();
  const { id } = useRoute<Rt>().params;
  const cancel = useAppointmentsStore((s) => s.cancel);
  const [choice, setChoice] = useState(1);
  const [note, setNote] = useState('');

  const onCancel = () => {
    cancel(id);
    nav.navigate('Main', { screen: 'Agenda' });
  };

  return (
    <Screen footer={<Button title="Annuler le rendez-vous" variant="blue" onPress={onCancel} />}>
      <TopBar title="Annuler le rendez-vous" tint={colors.blue} />
      <Text style={styles.intro}>Indiquez la raison de l'annulation. Cela nous aide à améliorer le service.</Text>

      {REASONS.map((r, i) => (
        <Pressable key={r} style={styles.option} onPress={() => setChoice(i)}>
          <Ionicons
            name={i === choice ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={colors.blue}
          />
          <Text style={styles.optionText}>{r}</Text>
        </Pressable>
      ))}

      <View style={styles.textareaWrap}>
        <TextInput
          placeholder="Saisissez votre raison ici…"
          placeholderTextColor={colors.grey}
          multiline
          value={note}
          onChangeText={setNote}
          style={styles.textarea}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginBottom: spacing.lg },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  optionText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
  textareaWrap: { backgroundColor: colors.bluePale, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  textarea: { minHeight: 110, fontFamily: fonts.body, fontSize: 14, color: colors.ink, textAlignVertical: 'top' },
});
