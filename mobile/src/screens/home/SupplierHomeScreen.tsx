import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import {
  getMySupplierProfile,
  listMyProducts,
  listMyReceivedOrders,
  type Supplier,
  type Product,
  type Order,
} from '../../services/marketplace';
import SideMenu, { type SideMenuItem } from '../../components/SideMenu';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_LABEL: Record<Order['status'], string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

/**
 * Tableau de bord Fournisseur : résumé de la boutique (produits actifs,
 * commandes en attente) et accès rapide aux commandes reçues les plus
 * récentes, sur le même modèle que les accueils Éleveur/Vétérinaire.
 */
export default function SupplierHomeScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    await Promise.all([
      getMySupplierProfile().then(({ data }) => setProfile(data)).catch(() => {}),
      listMyProducts().then(({ data }) => setProducts(data)).catch(() => {}),
      listMyReceivedOrders().then(({ data }) => setOrders(data)).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const activeProducts = products.filter((p) => p.active !== false).length;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;

  const menuItems: SideMenuItem[] = [
    { icon: 'package-variant-closed', label: 'Mes produits', badge: products.length, onPress: () => nav.navigate('SupplierProducts') },
    { icon: 'clipboard-list-outline', label: 'Commandes reçues', badge: pendingOrders, onPress: () => nav.navigate('SupplierOrders') },
    { icon: 'account-circle-outline', label: 'Mon profil', onPress: () => nav.navigate('Main', { screen: 'ProfileTab' }) },
    { icon: 'store-edit-outline', label: 'Ma boutique', onPress: () => nav.navigate('SupplierProfile') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
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
              <Text style={styles.name} numberOfLines={1}>{profile?.name ?? user?.name ?? 'Bienvenue'}</Text>
            </View>
          </Pressable>
          <View style={styles.headerIcons}>
            <RoundIcon icon="notifications-outline" label="Notifications" onPress={() => nav.navigate('Notifications')} />
            <RoundIcon icon="menu" label="Menu" onPress={() => setMenuOpen(true)} />
          </View>
        </View>

        <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" items={menuItems} />

        {/* Résumé */}
        <Text style={styles.section}>Ma boutique en un coup d'œil</Text>
        <View style={styles.summary}>
          <SummaryTile value={activeProducts} label="produits actifs" icon="package-variant-closed" />
          <SummaryTile value={pendingOrders} label="commandes en attente" icon="clock-outline" />
          <SummaryTile value={orders.length} label="commandes reçues" icon="clipboard-list-outline" />
        </View>

        {/* Accès rapide */}
        <View style={styles.actions}>
          <Pressable style={styles.actionCard} onPress={() => nav.navigate('SupplierProducts')}>
            <MaterialCommunityIcons name="package-variant-closed" size={26} color={colors.green} />
            <Text style={styles.actionLabel}>Mes produits</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => nav.navigate('SupplierOrders')}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={26} color={colors.green} />
            <Text style={styles.actionLabel}>Commandes</Text>
          </Pressable>
        </View>

        {/* Commandes récentes */}
        <Text style={styles.section}>Commandes récentes</Text>
        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="clipboard-outline" size={28} color={colors.green} />
            <Text style={styles.emptyTitle}>Aucune commande reçue</Text>
            <Text style={styles.emptyBody}>
              Les commandes passées par les éleveurs sur vos produits apparaîtront ici.
            </Text>
          </View>
        ) : (
          orders.slice(0, 5).map((o) => (
            <Pressable
              key={o.id}
              style={styles.orderCard}
              onPress={() => nav.navigate('SupplierOrders')}
            >
              <View style={styles.orderHead}>
                <Text style={styles.orderBuyer}>{o.buyerName ?? 'Éleveur'}</Text>
                <Text style={styles.orderStatus}>{STATUS_LABEL[o.status]}</Text>
              </View>
              <Text style={styles.orderAmount}>{o.totalAmount.toLocaleString('fr-FR')} FCFA</Text>
            </Pressable>
          ))
        )}

        {products.length === 0 && (
          <Pressable style={styles.emptyCard} onPress={() => nav.navigate('SupplierProducts')}>
            <MaterialCommunityIcons name="plus-circle-outline" size={28} color={colors.green} />
            <Text style={styles.emptyTitle}>Aucun produit publié</Text>
            <Text style={styles.emptyBody}>
              Ajoutez votre premier produit pour apparaître dans le marché des éleveurs.
            </Text>
          </Pressable>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View style={styles.summaryTile}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.green} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel} numberOfLines={2}>{label}</Text>
    </View>
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

  summary: { flexDirection: 'row', gap: spacing.md },
  summaryTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    ...shadow.soft,
  },
  summaryValue: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.brown, marginTop: 2 },
  summaryLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.grey, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    ...shadow.soft,
  },
  actionLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.brown },

  orderCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderBuyer: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brown },
  orderStatus: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.green },
  orderAmount: { fontFamily: fonts.body, fontSize: 13, color: colors.grey },

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
