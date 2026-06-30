import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { listVets, type Vet } from '../../services/vets';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { key: 'eleveurs', label: 'Éleveurs', icon: 'cow' as const },
  { key: 'producteurs', label: 'Producteurs', icon: 'silo' as const },
  { key: 'veterinaires', label: 'Vétérinaires', icon: 'medical-bag' as const },
  { key: 'marche', label: 'Marché', icon: 'storefront' as const },
];

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVets().then((v) => {
      setVets(v);
      setLoading(false);
    });
  }, []);

  const featured = vets.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.userRow} onPress={() => nav.navigate('Main', { screen: 'ProfileTab' })}>
            <Image
              source={{ uri: user?.avatarUrl ?? 'https://i.pravatar.cc/100?u=mokinevet' }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.hello}>Bonjour</Text>
              <Text style={styles.name}>{user?.name ?? 'Bienvenue'}</Text>
            </View>
          </Pressable>
          <View style={styles.headerIcons}>
            <RoundIcon icon="notifications-outline" onPress={() => nav.navigate('Notifications')} />
            <RoundIcon icon="settings-outline" onPress={() => nav.navigate('Settings')} />
          </View>
        </View>

        {/* Search row */}
        <View style={styles.searchRow}>
          <Pressable style={styles.shortcut} onPress={() => nav.navigate('VetList', { title: 'Vétérinaires' })}>
            <MaterialCommunityIcons name="stethoscope" size={22} color={colors.green} />
            <Text style={styles.shortcutLabel}>Veto</Text>
          </Pressable>
          <Pressable style={styles.shortcut} onPress={() => nav.navigate('Favorites')}>
            <Ionicons name="heart-outline" size={22} color={colors.green} />
            <Text style={styles.shortcutLabel}>Favoris</Text>
          </Pressable>
          <View style={styles.search}>
            <Pressable style={styles.filterBtn}>
              <Ionicons name="options-outline" size={18} color={colors.white} />
            </Pressable>
            <TextInput placeholder="Recherche…" placeholderTextColor={colors.grey} style={styles.searchInput} />
            <Ionicons name="search" size={18} color={colors.green} />
          </View>
        </View>

        {/* Featured carousel */}
        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginVertical: spacing.xxl }} />
        ) : (
          <FlatList
            data={featured}
            keyExtractor={(v) => v.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: spacing.sm }}
            renderItem={({ item }) => <FeaturedCard vet={item} onPress={() => nav.navigate('VetDetail', { id: item.id })} />}
          />
        )}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction icon="sparkles-outline" label="Assistant IA" onPress={() => nav.navigate('Chatbot')} />
          <QuickAction icon="book-outline" label="Fiches" onPress={() => nav.navigate('FichesList')} />
          <QuickAction icon="albums-outline" label="Cheptel" onPress={() => nav.navigate('HerdList')} />
          <QuickAction icon="storefront-outline" label="Marketplace" onPress={() => nav.navigate('ProductList')} />
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Parcourir par catégorie</Text>
        <View style={styles.categories}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              style={styles.category}
              onPress={() =>
                c.key === 'eleveurs'
                  ? nav.navigate('HerdList')
                  : c.key === 'marche'
                    ? nav.navigate('FichesList')
                    : nav.navigate('VetList', { title: c.label })
              }
            >
              <View style={styles.categoryIcon}>
                <MaterialCommunityIcons name={c.icon} size={26} color={colors.brown} />
              </View>
              <Text style={styles.categoryLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* List */}
        {vets.slice(0, 4).map((v) => (
          <Pressable key={v.id} style={styles.listCard} onPress={() => nav.navigate('VetDetail', { id: v.id })}>
            <Image source={{ uri: v.photo }} style={styles.listAvatar} />
            <View style={styles.listInfo}>
              <Text style={styles.listName} numberOfLines={1}>{v.name}</Text>
              <Text style={styles.listSpecialty} numberOfLines={1}>{v.specialty}</Text>
              <View style={styles.listMeta}>
                <Ionicons name="star" size={13} color={colors.star} />
                <Text style={styles.listMetaText}>{v.rating}</Text>
                <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.white} style={{ marginLeft: spacing.md }} />
                <Text style={styles.listMetaText}>{v.reviews}</Text>
              </View>
            </View>
            <Ionicons name="heart-outline" size={20} color={colors.white} />
          </Pressable>
        ))}
        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={colors.white} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function RoundIcon({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable style={styles.roundIcon} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.white} />
    </Pressable>
  );
}

function FeaturedCard({ vet, onPress }: { vet: Vet; onPress: () => void }) {
  return (
    <Pressable style={styles.featured} onPress={onPress}>
      <Image source={{ uri: vet.photo }} style={styles.featuredAvatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.featuredName} numberOfLines={1}>{vet.name}</Text>
        <Text style={styles.featuredSpec} numberOfLines={1}>Vétérinaire {vet.ordreNumber}</Text>
        <View style={styles.featuredChips}>
          <View style={styles.featuredChip}>
            <Ionicons name="star" size={12} color={colors.star} />
            <Text style={styles.featuredChipText}>{vet.rating}</Text>
          </View>
          <View style={styles.featuredChip}>
            <Ionicons name="time-outline" size={12} color={colors.white} />
            <Text style={styles.featuredChipText} numberOfLines={1}>{vet.schedule}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgBlue },
  content: { padding: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  hello: { fontFamily: fonts.body, color: colors.green, fontSize: 13 },
  name: { fontFamily: fonts.bodyBold, color: colors.brown, fontSize: 16 },
  headerIcons: { flexDirection: 'row', gap: spacing.md },
  roundIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  shortcut: { alignItems: 'center' },
  shortcutLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.green, marginTop: 2 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingRight: spacing.lg, height: 46, ...shadow.soft },
  filterBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },

  featured: { width: 320, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.brown, borderRadius: radii.lg, padding: spacing.lg, marginRight: spacing.md },
  featuredAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.white },
  featuredName: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.white },
  featuredSpec: { fontFamily: fonts.body, fontSize: 12, color: '#ffffffcc', marginBottom: spacing.sm },
  featuredChips: { flexDirection: 'row', gap: spacing.sm },
  featuredChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff22', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, maxWidth: 150 },
  featuredChipText: { fontFamily: fonts.body, fontSize: 11, color: colors.white },

  quickRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  quickAction: { flex: 1, alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.lg, paddingVertical: spacing.md, ...shadow.soft },
  quickIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  quickLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.brown },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.green, marginTop: spacing.lg, marginBottom: spacing.md },
  categories: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  category: { alignItems: 'center', flex: 1 },
  categoryIcon: { width: 64, height: 64, borderRadius: radii.lg, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs, ...shadow.soft },
  categoryLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.green },

  listCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.green, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  listAvatar: { width: 56, height: 56, borderRadius: 28 },
  listInfo: { flex: 1 },
  listName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.white },
  listSpecialty: { fontFamily: fonts.body, fontSize: 12, color: '#ffffffcc' },
  listMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  listMetaText: { fontFamily: fonts.body, fontSize: 11, color: colors.white, marginLeft: 3 },
});
