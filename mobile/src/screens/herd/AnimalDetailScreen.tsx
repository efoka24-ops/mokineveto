import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Input, Screen, Select, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { useHerdStore, type HealthEvent } from '../../store/useHerdStore';
import type { RootStackParamList } from '../../navigation/types';

type Rt = RouteProp<RootStackParamList, 'AnimalDetail'>;

const TYPE_LABEL: Record<HealthEvent['type'], string> = {
  VACCIN: 'Vaccination', VERMIFUGE: 'Vermifuge', TRAITEMENT: 'Traitement', AUTRE: 'Autre',
};

export default function AnimalDetailScreen() {
  const { id } = useRoute<Rt>().params;
  const animal = useHerdStore((s) => s.animals.find((a) => a.id === id));
  const addEvent = useHerdStore((s) => s.addEvent);
  const [type, setType] = useState<HealthEvent['type']>('VACCIN');
  const [label, setLabel] = useState('');

  if (!animal) {
    return (
      <Screen>
        <TopBar title="Animal" />
        <Text style={styles.muted}>Animal introuvable.</Text>
      </Screen>
    );
  }

  const save = () => {
    if (!label.trim()) return;
    const date = new Date().toLocaleDateString('fr-FR');
    addEvent(animal.id, { type, label: label.trim(), date });
    setLabel('');
  };

  return (
    <Screen scroll>
      <TopBar title={animal.name} />
      <View style={styles.head}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="cow" size={34} color={colors.white} />
        </View>
        <Text style={styles.name}>{animal.name}</Text>
        <Text style={styles.meta}>{animal.species} · {animal.breed} · {animal.sex === 'F' ? 'Femelle' : 'Mâle'} · {animal.age}</Text>
        {animal.robe ? <Text style={styles.meta}>{animal.robe}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Carnet de santé</Text>
      {animal.health.map((e) => (
        <View key={e.id} style={styles.eventRow}>
          <View style={styles.eventIcon}>
            <Ionicons name="medkit" size={16} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventLabel}>{e.label}</Text>
            <Text style={styles.eventMeta}>{TYPE_LABEL[e.type]} · {e.date}</Text>
          </View>
        </View>
      ))}
      {animal.health.length === 0 ? <Text style={styles.empty}>Aucun événement de santé.</Text> : null}

      <Text style={styles.sectionTitle}>Ajouter un événement</Text>
      <Select
        value={type}
        onChange={(v) => setType(v as HealthEvent['type'])}
        options={[
          { label: 'Vaccination', value: 'VACCIN' },
          { label: 'Vermifuge', value: 'VERMIFUGE' },
          { label: 'Traitement', value: 'TRAITEMENT' },
          { label: 'Autre', value: 'AUTRE' },
        ]}
      />
      <Input placeholder="Description (ex: Vaccin charbon)" value={label} onChangeText={setLabel} />
      <Pressable style={styles.addBtn} onPress={save}>
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.addText}>Ajouter au carnet</Text>
      </Pressable>
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xxl },
  head: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brown, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  name: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.brown },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.grey },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.green, marginTop: spacing.lg, marginBottom: spacing.md },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  eventIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  eventLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink },
  eventMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.grey },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.green, borderRadius: radii.pill, paddingVertical: spacing.md, marginTop: spacing.sm },
  addText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.white },
});
