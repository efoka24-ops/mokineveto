import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, VetCard } from '../../components';
import { spacing } from '../../theme';
import { listTopRated, type Vet } from '../../services/vets';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function TopRatedScreen() {
  const nav = useNavigation<Nav>();
  const [vets, setVets] = useState<Vet[]>([]);
  const { ids, toggle, hydrate } = useFavoritesStore();

  useEffect(() => {
    hydrate();
    listTopRated().then(setVets);
  }, [hydrate]);

  return (
    <Screen>
      <TopBar title="Étoiles" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {vets.map((v) => (
          <VetCard
            key={v.id}
            vet={v}
            variant="brown"
            favorite={ids.includes(v.id)}
            onPress={() => nav.navigate('VetDetail', { id: v.id })}
            onToggleFavorite={() => toggle(v.id)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
