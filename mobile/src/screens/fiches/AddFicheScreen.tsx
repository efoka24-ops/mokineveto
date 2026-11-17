import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Screen, Select, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';
import { createFiche } from '../../services/fiches';
import { toUserMessage } from '../../services/api';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SPECIES_OPTIONS = ['Bovin', 'Ovin', 'Caprin', 'Porcin', 'Volaille'];

/**
 * Ajout d'une fiche pathologique par un vétérinaire (SFD §4.4.4).
 * Réservé côté API aux rôles ADMIN et VETERINAIRE — un praticien connaît le
 * terrain aussi bien qu'un administrateur.
 */
export default function AddFicheScreen() {
  const nav = useNavigation<Nav>();
  const [form, setForm] = useState({
    name: '',
    description: '',
    fieldObs: '',
    prevention: '',
    vetInfo: '',
  });
  const [species, setSpecies] = useState<string[]>([]);
  const [contagious, setContagious] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSpecies = (s: string) =>
    setSpecies((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));

  const submit = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      Alert.alert('Champs requis', 'Le nom de la pathologie et la description sont requis.');
      return;
    }
    setSaving(true);
    try {
      await createFiche({ ...form, species, contagious });
      Alert.alert('Fiche créée', 'La fiche a été ajoutée à la base de connaissances.');
      nav.goBack();
    } catch (err) {
      Alert.alert('Échec', toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen bg={colors.white} scroll footer={<Button title="Créer la fiche" loading={saving} onPress={submit} />}>
      <TopBar title="Nouvelle fiche" />
      <Input label="Nom de la pathologie" value={form.name} onChangeText={set('name')} />

      <Text style={styles.label}>Espèces concernées</Text>
      <View style={styles.chips}>
        {SPECIES_OPTIONS.map((s) => {
          const active = species.includes(s);
          return (
            <Button
              key={s}
              title={s}
              variant={active ? 'green' : 'outline'}
              onPress={() => toggleSpecies(s)}
              style={styles.chipBtn}
            />
          );
        })}
      </View>

      <Select
        label="Contagieux"
        value={contagious ? 'yes' : 'no'}
        onChange={(v) => setContagious(v === 'yes')}
        options={[{ label: 'Non', value: 'no' }, { label: 'Oui', value: 'yes' }]}
      />

      <Input label="Description" value={form.description} onChangeText={set('description')} multiline />
      <Input label="Observations de terrain" value={form.fieldObs} onChangeText={set('fieldObs')} multiline />
      <Input label="Prévention" value={form.prevention} onChangeText={set('prevention')} multiline />
      <Input label="Information vétérinaire" value={form.vetInfo} onChangeText={set('vetInfo')} multiline />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chipBtn: { paddingHorizontal: spacing.md },
});
