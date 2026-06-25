import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { listFiches, FICHE_PRICE, type Fiche } from '../../services/fiches';
import { useFichesStore } from '../../store/useFichesStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function FichesListScreen() {
  const nav = useNavigation<Nav>();
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const { hydrate, isUnlocked } = useFichesStore();

  useEffect(() => {
    hydrate();
    listFiches().then(setFiches);
  }, [hydrate]);

  return (
    <Screen>
      <TopBar title="Fiches techniques" />
      <View style={styles.banner}>
        <Ionicons name="book" size={18} color={colors.white} />
        <Text style={styles.bannerText}>
          {fiches.length}+ fiches pathologiques · {FICHE_PRICE} FCFA / consultation (non téléchargeable)
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {fiches.map((f) => (
          <Pressable key={f.id} style={styles.card} onPress={() => nav.navigate('FicheDetail', { id: f.id })}>
            <View style={{ flex: 1 }}>
              <View style={styles.cardHead}>
                <Text style={styles.name}>{f.name}</Text>
                {f.contagious ? (
                  <View style={styles.tag}><Text style={styles.tagText}>Contagieux</Text></View>
                ) : null}
              </View>
              <Text style={styles.species}>{f.species.join(' · ')}</Text>
            </View>
            {isUnlocked(f.id) ? (
              <Ionicons name="lock-open" size={18} color={colors.green} />
            ) : (
              <View style={styles.price}><Text style={styles.priceText}>{FICHE_PRICE} F</Text></View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.green, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.lg },
  bannerText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.white },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.soft },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brown },
  tag: { backgroundColor: colors.danger, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tagText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.white },
  species: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
  price: { backgroundColor: colors.greenPale, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  priceText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.greenDark },
});
