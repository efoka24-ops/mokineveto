import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Screen, Select, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';
import { useHerdStore } from '../../store/useHerdStore';

export default function AddAnimalScreen() {
  const nav = useNavigation<any>();
  const add = useHerdStore((s) => s.add);
  const [form, setForm] = useState({ name: '', species: 'Bovin', breed: '', age: '', robe: '' });
  const [sex, setSex] = useState<'M' | 'F'>('F');

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    add({ ...form, sex });
    nav.goBack();
  };

  return (
    <Screen bg={colors.white} scroll footer={<Button title="Enregistrer l'animal" onPress={save} />}>
      <TopBar title="Nouvel animal" />
      <Input label="Nom / identifiant" value={form.name} onChangeText={set('name')} />
      <Select
        label="Espèce"
        value={form.species}
        onChange={set('species')}
        options={[
          { label: 'Bovin', value: 'Bovin' },
          { label: 'Ovin', value: 'Ovin' },
          { label: 'Caprin', value: 'Caprin' },
          { label: 'Porcin', value: 'Porcin' },
          { label: 'Volaille', value: 'Volaille' },
        ]}
      />
      <Input label="Race" value={form.breed} onChangeText={set('breed')} />

      <Text style={styles.label}>Sexe</Text>
      <View style={styles.sexRow}>
        {(['F', 'M'] as const).map((x) => (
          <Pressable key={x} style={[styles.sexBtn, sex === x && styles.sexActive]} onPress={() => setSex(x)}>
            <Text style={[styles.sexText, sex === x && styles.sexTextActive]}>{x === 'F' ? 'Femelle' : 'Mâle'}</Text>
          </Pressable>
        ))}
      </View>

      <Input label="Âge" placeholder="ex: 2 ans" value={form.age} onChangeText={set('age')} />
      <Input label="Robe / couleur" value={form.robe} onChangeText={set('robe')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink, marginBottom: spacing.sm },
  sexRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  sexBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 14, backgroundColor: colors.greenPale, alignItems: 'center' },
  sexActive: { backgroundColor: colors.green },
  sexText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.greenDark },
  sexTextActive: { color: colors.white },
});
