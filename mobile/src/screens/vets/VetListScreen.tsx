import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, VetCard } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { listVets, type Vet } from '../../services/vets';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'VetList'>;

type Sort = 'az' | 'rating' | 'fav';

export default function VetListScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const title = route.params?.title ?? 'Vétérinaires';
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>('az');
  const { ids, toggle, hydrate } = useFavoritesStore();

  useEffect(() => {
    hydrate();
    listVets().then((v) => {
      setVets(v);
      setLoading(false);
    });
  }, [hydrate]);

  const sorted = useMemo(() => {
    const arr = [...vets];
    if (sort === 'az') arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'rating') arr.sort((a, b) => b.rating - a.rating);
    if (sort === 'fav') return arr.filter((v) => ids.includes(v.id));
    return arr;
  }, [vets, sort, ids]);

  return (
    <Screen>
      <TopBar
        title={title}
        right={
          <Pressable style={styles.headBtn}>
            <Ionicons name="search" size={18} color={colors.white} />
          </Pressable>
        }
      />
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Trier</Text>
        <Chip active={sort === 'az'} label="A→Z" onPress={() => setSort('az')} />
        <Chip active={sort === 'rating'} label="★ Note" onPress={() => setSort('rating')} />
        <Chip active={sort === 'fav'} label="♥ Favoris" onPress={() => setSort('fav')} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: spacing.xxl }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          {sorted.map((v) => (
            <VetCard
              key={v.id}
              vet={v}
              variant="brown"
              favorite={ids.includes(v.id)}
              onPress={() => nav.navigate('VetDetail', { id: v.id })}
              onInfo={() => nav.navigate('VetDetail', { id: v.id })}
              onToggleFavorite={() => toggle(v.id)}
            />
          ))}
          {sorted.length === 0 ? <Text style={styles.empty}>Aucun vétérinaire</Text> : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? colors.green : colors.brown }]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  sortLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginRight: spacing.xs },
  chip: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.white },
  empty: { textAlign: 'center', color: colors.grey, fontFamily: fonts.body, marginTop: spacing.xxl },
});
