import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useHerdStore } from '../../store/useHerdStore';
import { api } from '../../services/api';

const REGIONS = [
  'ADAMAOUA', 'CENTRE', 'EST', 'EXTREME_NORD', 'LITTORAL',
  'NORD', 'NORD_OUEST', 'OUEST', 'SUD', 'SUD_OUEST',
];

export default function FarmListScreen() {
  const { farms, currentFarmId, loadFarms, setCurrentFarm, setFarmLocation } = useHerdStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('CENTRE');
  const [saving, setSaving] = useState(false);
  const [locatingId, setLocatingId] = useState<string | null>(null);

  const captureLocation = async (farmId: string) => {
    setLocatingId(farmId);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await setFarmLocation(farmId, pos.coords.latitude, pos.coords.longitude);
    } catch (_err) {
      console.warn('[FarmListScreen] Failed to capture location');
    } finally {
      setLocatingId(null);
    }
  };

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
            {f.lat == null && (
              <Text style={styles.noLocation}>Position non renseignée — requise pour les consultations terrain</Text>
            )}
          </View>
          <Pressable
            hitSlop={10}
            disabled={locatingId === f.id}
            onPress={() => captureLocation(f.id)}
            accessibilityRole="button"
            accessibilityLabel="Renseigner la position GPS"
          >
            <Ionicons name={f.lat != null ? 'location' : 'location-outline'} size={20} color={f.lat != null ? colors.green : colors.grey} />
          </Pressable>
          {currentFarmId === f.id ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.green} style={{ marginLeft: spacing.sm }} />
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
  noLocation: { fontFamily: fonts.body, fontSize: 10, color: colors.star, marginTop: 2 },
});
