import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useHerdStore } from '../../store/useHerdStore';
import { listAlerts, type HealthAlert } from '../../services/alerts';
import AlertBanner from '../../components/AlertBanner';
import VetCard from '../../components/VetCard';
import SideMenu, { type SideMenuItem } from '../../components/SideMenu';
import * as Location from 'expo-location';
import { getNearbyVets, type Vet as ApiVet } from '../../services/api';
import { listSuppliers, type Supplier } from '../../services/marketplace';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Un animal est considéré en suivi actif dès qu'il porte au moins un événement de santé. */
function hasActiveRecord(animal: { healthEvents?: unknown[] }): boolean {
  return (animal.healthEvents?.length ?? 0) > 0;
}

type Category = 'ELEVEURS' | 'FOURNISSEURS' | 'VETERINAIRES';

/**
 * Tableau de bord Éleveur, aligné sur la maquette « Accueil - Éleveur » :
 * catégories parcourables (Éleveurs / Fournisseurs / Vétérinaires) qui
 * filtrent la liste en dessous. Les fonctionnalités qui figuraient ici avant
 * (résumé du cheptel, urgence) restent accessibles depuis le menu latéral —
 * rien n'a disparu, seule la mise en avant a changé.
 */
export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const animals = useHerdStore((s) => s.animals);
  const hydrate = useHerdStore((s) => s.hydrate);

  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyVets, setNearbyVets] = useState<ApiVet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<Category>('VETERINAIRES');

  const loadNearbyVets = useCallback(async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { data } = await getNearbyVets(pos.coords.latitude, pos.coords.longitude, 5);
      setNearbyVets(data);
    } catch {
      // géolocalisation indisponible : la tuile "Consulter un Vétérinaire" reste l'accès normal
    }
  }, []);

  const load = useCallback(async () => {
    await Promise.all([
      hydrate().catch(() => {}),
      listAlerts().then(setAlerts),
      loadNearbyVets(),
      listSuppliers().then(({ data }) => setSuppliers(data)).catch(() => {}),
    ]);
  }, [hydrate, loadNearbyVets]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const withRecord = animals.filter(hasActiveRecord).length;

  const menuItems: SideMenuItem[] = [
    { icon: 'cow', label: 'Mon cheptel', badge: animals.length, onPress: () => nav.navigate('HerdList') },
    { icon: 'virus-outline', label: 'Animaux malades', badge: withRecord, onPress: () => nav.navigate('HerdList') },
    { icon: 'calendar-clock', label: 'Mes rendez-vous', onPress: () => nav.navigate('Main', { screen: 'Agenda' }) },
    { icon: 'message-text-outline', label: 'Mes messages', onPress: () => nav.navigate('Main', { screen: 'Messages' }) },
    { icon: 'book-outline', label: 'Fiches techniques', onPress: () => nav.navigate('FichesList') },
    { icon: 'store-outline', label: 'Marketplace', onPress: () => nav.navigate('ProductList') },
    { icon: 'notebook-outline', label: 'Mon carnet', onPress: () => nav.navigate('Carnet') },
    { icon: 'alert-octagon', label: 'Urgence', tone: 'danger', onPress: () => nav.navigate('Emergency') },
  ];

  const categories: { key: Category; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { key: 'ELEVEURS', label: 'Éleveurs', icon: 'cow' },
    { key: 'FOURNISSEURS', label: 'Fournisseurs', icon: 'store-outline' },
    { key: 'VETERINAIRES', label: 'Vétérinaires', icon: 'stethoscope' },
  ];

  const onCategoryPress = (key: Category) => {
    if (key === 'ELEVEURS') {
      nav.navigate('HerdList');
      return;
    }
    setCategory(key);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />
        }
      >
        {/* En-tête */}
        <View style={styles.header}>
          <Pressable
            style={styles.userRow}
            onPress={() => nav.navigate('Main', { screen: 'ProfileTab' })}
            accessibilityRole="button"
            accessibilityLabel="Mon profil"
          >
            <Image
              source={{ uri: user?.avatarUrl ?? 'https://i.pravatar.cc/100?u=mokinevet' }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.hello}>Bonjour</Text>
              <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'Bienvenue'}</Text>
            </View>
          </Pressable>
          <View style={styles.headerIcons}>
            <RoundIcon icon="notifications-outline" label="Notifications" onPress={() => nav.navigate('Notifications')} />
            <RoundIcon icon="menu" label="Menu" onPress={() => setMenuOpen(true)} />
          </View>
        </View>

        <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" items={menuItems} />

        {/* Alertes sanitaires régionales — reste visible en priorité, question de sécurité */}
        <AlertBanner alerts={alerts} />

        {/* Parcourir par catégorie */}
        <Text style={styles.section}>Parcourir par catégorie</Text>
        <View style={styles.categories}>
          {categories.map((c) => (
            <Pressable
              key={c.key}
              style={[styles.categoryTile, category === c.key && styles.categoryTileActive]}
              onPress={() => onCategoryPress(c.key)}
            >
              <MaterialCommunityIcons
                name={c.icon}
                size={22}
                color={category === c.key ? colors.white : colors.brown}
              />
              <Text style={[styles.categoryLabel, category === c.key && styles.categoryLabelActive]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Liste selon la catégorie sélectionnée */}
        {category === 'VETERINAIRES' && (
          <>
            <Text style={styles.section}>Vétérinaires les plus proches</Text>
            {nearbyVets.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="stethoscope" size={28} color={colors.green} />
                <Text style={styles.emptyTitle}>Aucun vétérinaire trouvé à proximité</Text>
                <Text style={styles.emptyBody}>Activez la localisation pour voir les praticiens proches de vous.</Text>
              </View>
            ) : (
              nearbyVets.map((v) => (
                <VetCard
                  key={v.id}
                  vet={{ ...v, photo: v.photo ?? '', focus: v.focus ?? '', ordreNumber: v.ordreNumber ?? '' }}
                  onPress={() => nav.navigate('VetDetail', { id: v.id })}
                  onInfo={() => nav.navigate('VetDetail', { id: v.id })}
                />
              ))
            )}
          </>
        )}

        {category === 'FOURNISSEURS' && (
          <>
            <Text style={styles.section}>Fournisseurs à proximité</Text>
            {suppliers.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="store-outline" size={28} color={colors.green} />
                <Text style={styles.emptyTitle}>Aucun fournisseur pour l'instant</Text>
                <Text style={styles.emptyBody}>Les fournisseurs inscrits sur MokineVeto apparaîtront ici.</Text>
              </View>
            ) : (
              suppliers.map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.supplierCard}
                  onPress={() => nav.navigate('ProductList')}
                >
                  <View style={styles.supplierAvatar}>
                    <MaterialCommunityIcons name="store" size={22} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.supplierName} numberOfLines={1}>{s.name}</Text>
                    {!!s.address && <Text style={styles.supplierMeta} numberOfLines={1}>{s.address}</Text>}
                    {!!s.schedule && <Text style={styles.supplierMeta} numberOfLines={1}>{s.schedule}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.white} />
                </Pressable>
              ))
            )}
          </>
        )}

        {/* Espace pour la barre d'onglets et le bouton d'urgence flottant. */}
        <View style={{ height: 150 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RoundIcon({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.roundIcon}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgBlue },
  content: { padding: spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  userRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  hello: { fontFamily: fonts.body, color: colors.green, fontSize: 13 },
  name: { fontFamily: fonts.bodyBold, color: colors.brown, fontSize: 16 },
  headerIcons: { flexDirection: 'row', gap: spacing.md },
  // 48 dp : minimum de cible tactile exigé par la SFD §8.2.
  roundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.brown,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },

  categories: { flexDirection: 'row', gap: spacing.md },
  categoryTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    ...shadow.soft,
  },
  categoryTileActive: { backgroundColor: colors.brown },
  categoryLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.brown },
  categoryLabelActive: { color: colors.white },

  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brown,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  supplierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  supplierMeta: { fontFamily: fonts.body, fontSize: 12, color: '#ffffffcc', marginTop: 2 },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginTop: spacing.md,
    ...shadow.soft,
  },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brown, marginTop: spacing.sm },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.grey,
    textAlign: 'center',
    marginTop: 2,
  },
});
