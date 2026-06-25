import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar, VetCard } from '../../components';
import { colors, fonts, spacing } from '../../theme';
import { listVets, type Vet } from '../../services/vets';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function FavoritesScreen() {
  const nav = useNavigation<Nav>();
  const [vets, setVets] = useState<Vet[]>([]);
  const { ids, toggle, hydrate } = useFavoritesStore();

  useEffect(() => {
    hydrate();
    listVets().then(setVets);
  }, [hydrate]);

  const favs = vets.filter((v) => ids.includes(v.id));

  return (
    <Screen>
      <TopBar title="Favoris" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {favs.map((v) => (
          <VetCard
            key={v.id}
            vet={v}
            variant="brown"
            favorite
            onPress={() => nav.navigate('VetDetail', { id: v.id })}
            onToggleFavorite={() => toggle(v.id)}
          />
        ))}
        {favs.length === 0 ? (
          <Text style={styles.empty}>Aucun favori pour l'instant. Touchez ♥ sur un vétérinaire.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.grey, fontFamily: fonts.body, marginTop: spacing.xxxl },
});
