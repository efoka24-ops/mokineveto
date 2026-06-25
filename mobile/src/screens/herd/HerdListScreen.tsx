import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useHerdStore } from '../../store/useHerdStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HerdListScreen() {
  const nav = useNavigation<Nav>();
  const { animals, hydrate } = useHerdStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Screen>
      <TopBar
        title="Mon cheptel"
        right={
          <Pressable style={styles.addBtn} onPress={() => nav.navigate('AddAnimal')}>
            <Ionicons name="add" size={22} color={colors.white} />
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {animals.map((a) => (
          <Pressable key={a.id} style={styles.card} onPress={() => nav.navigate('AnimalDetail', { id: a.id })}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="cow" size={26} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{a.name}</Text>
              <Text style={styles.meta}>{a.species} · {a.breed} · {a.sex === 'F' ? 'Femelle' : 'Mâle'} · {a.age}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="medkit-outline" size={13} color={colors.greenDark} />
              <Text style={styles.badgeText}>{a.health.length}</Text>
            </View>
          </Pressable>
        ))}
        {animals.length === 0 ? (
          <Text style={styles.empty}>Aucun animal. Touchez + pour enregistrer un animal.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brown, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brown },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenPale, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.greenDark },
  empty: { textAlign: 'center', color: colors.grey, fontFamily: fonts.body, marginTop: spacing.xxxl },
});
