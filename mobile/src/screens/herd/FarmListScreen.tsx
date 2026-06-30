import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useHerdStore } from '../../store/useHerdStore';
import { api } from '../../services/api';

const REGIONS = [
  'ADAMAOUA', 'CENTRE', 'EST', 'EXTREME_NORD', 'LITTORAL',
  'NORD', 'NORD_OUEST', 'OUEST', 'SUD', 'SUD_OUEST',
];

export default function FarmListScreen() {
  const { farms, currentFarmId, loadFarms, setCurrentFarm } = useHerdStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('CENTRE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFarms();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      await api.post('/farms', { name: name.trim(), region }, true);
      await loadFarms();
      setName('');
      setShowForm(false);
    } catch (_err) {
      console.warn('[FarmListScreen] Failed to create farm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll bg={colors.white}>
      <TopBar
        title="Mes élevages"
        tint={colors.green}
        right={
          <Pressable onPress={() => setShowForm((v) => !v)}>
            <Ionicons name={showForm ? 'close' : 'add'} size={24} color={colors.green} />
          </Pressable>
        }
      />

      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.label}>Nom de l'élevage</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Ex : Ferme de Garoua" placeholderTextColor={colors.grey} style={styles.input} />
          <Text style={styles.label}>Région</Text>
          <View style={styles.regionWrap}>
            {REGIONS.map((r) => (
              <Pressable key={r} onPress={() => setRegion(r)} style={[styles.regionChip, region === r && styles.regionChipActive]}>
                <Text style={[styles.regionText, region === r && styles.regionTextActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <Button title="Créer l'élevage" loading={saving} onPress={create} style={{ marginTop: spacing.md }} />
        </View>
      ) : null}

      {farms.map((f) => (
        <Pressable
          key={f.id}
          style={[styles.card, currentFarmId === f.id && styles.cardActive]}
          onPress={() => setCurrentFarm(f.id)}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="home" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{f.name}</Text>
            <Text style={styles.region}>{f.region}{f.isDefault ? ' · par défaut' : ''}</Text>
          </View>
          {currentFarmId === f.id ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.green} />
          ) : null}
        </Pressable>
      ))}

      {farms.length === 0 ? <Text style={styles.muted}>Aucun élevage. Touchez + pour en créer un.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  form: { backgroundColor: colors.greenPale, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.green, marginBottom: spacing.sm },
  input: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, fontFamily: fonts.body, fontSize: 14, color: colors.ink, marginBottom: spacing.md },
  regionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  regionChip: { backgroundColor: colors.white, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  regionChipActive: { backgroundColor: colors.green },
  regionText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.greenDark },
  regionTextActive: { color: colors.white },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  cardActive: { borderWidth: 2, borderColor: colors.green },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brown, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  region: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
});
