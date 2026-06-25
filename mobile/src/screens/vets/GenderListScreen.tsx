import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, VetCard } from '../../components';
import { spacing } from '../../theme';
import { listByGender, type Vet } from '../../services/vets';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'GenderList'>;

export default function GenderListScreen() {
  const nav = useNavigation<Nav>();
  const { gender } = useRoute<Rt>().params;
  const [vets, setVets] = useState<Vet[]>([]);
  const { ids, toggle, hydrate } = useFavoritesStore();

  useEffect(() => {
    hydrate();
    listByGender(gender).then(setVets);
  }, [gender, hydrate]);

  return (
    <Screen>
      <TopBar title={gender === 'femme' ? 'Femme' : 'Homme'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {vets.map((v) => (
          <VetCard
            key={v.id}
            vet={v}
            variant="green"
            favorite={ids.includes(v.id)}
            onPress={() => nav.navigate('VetDetail', { id: v.id })}
            onToggleFavorite={() => toggle(v.id)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
