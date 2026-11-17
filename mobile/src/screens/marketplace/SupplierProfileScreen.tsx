import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, spacing } from '../../theme';
import { getMySupplierProfile, updateMySupplierProfile } from '../../services/marketplace';
import { toUserMessage } from '../../services/api';

/** Édition des informations de la boutique fournisseur (visibles des éleveurs). */
export default function SupplierProfileScreen() {
  const [form, setForm] = useState({ name: '', address: '', schedule: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMySupplierProfile()
      .then(({ data }) => setForm({ name: data.name ?? '', address: data.address ?? '', schedule: data.schedule ?? '' }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      await updateMySupplierProfile(form);
      Alert.alert('Enregistré', 'Les informations de votre boutique ont été mises à jour.');
    } catch (err) {
      Alert.alert('Enregistrement impossible', toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll bg={colors.white}>
      <TopBar title="Ma boutique" />
      {!loading && (
        <>
          <Input label="Nom de l'entreprise" value={form.name} onChangeText={set('name')} />
          <Input label="Adresse" value={form.address} onChangeText={set('address')} />
          <Input label="Horaires d'ouverture" placeholder="ex: Lun-Sam / 8:00-18:00" value={form.schedule} onChangeText={set('schedule')} />
          <Button title="Enregistrer" onPress={onSave} loading={saving} style={{ marginTop: spacing.lg }} />
        </>
      )}
    </Screen>
  );
}
