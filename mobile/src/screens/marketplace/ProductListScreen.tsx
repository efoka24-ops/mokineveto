import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { listProducts, type Product } from '../../services/marketplace';
import { useCartStore } from '../../store/useCartStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProductListScreen() {
  const nav = useNavigation<Nav>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { add, lines, supplierId } = useCartStore();

  useEffect(() => {
    listProducts()
      .then((res) => setProducts(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cartCount = lines.reduce((s, l) => s + l.qty, 0);

  const onAdd = (p: Product) => {
    const currentSupplier = supplierId();
    if (currentSupplier && currentSupplier !== p.supplierId) {
      // Different supplier — backend requires single-supplier orders
      return;
    }
    add(p);
  };

  return (
    <Screen scroll bg={colors.white}>
      <TopBar
        title="Marketplace"
        right={
          <Pressable onPress={() => nav.navigate('Cart')} style={styles.cartBtn}>
            <Ionicons name="cart-outline" size={22} color={colors.green} />
            {cartCount > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      {loading ? <Text style={styles.muted}>Chargement…</Text> : null}

      {products.map((p) => {
        const currentSupplier = supplierId();
        const disabled = !!currentSupplier && currentSupplier !== p.supplierId;
        return (
          <View key={p.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.meta}>{p.category} · {p.supplier?.name}</Text>
              <Text style={styles.price}>{p.price.toLocaleString('fr-FR')} XAF / {p.unit}</Text>
            </View>
            <Pressable
              style={[styles.addBtn, disabled && styles.addBtnDisabled]}
              onPress={() => onAdd(p)}
              disabled={disabled}
            >
              <Ionicons name="add" size={20} color={colors.white} />
            </Pressable>
          </View>
        );
      })}

      {!loading && products.length === 0 ? (
        <Text style={styles.muted}>Aucun produit disponible.</Text>
      ) : null}

      <Pressable style={styles.ordersLink} onPress={() => nav.navigate('OrderHistory')}>
        <Ionicons name="receipt-outline" size={18} color={colors.green} />
        <Text style={styles.ordersLinkText}>Mes commandes</Text>
      </Pressable>
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  cartBtn: { padding: spacing.xs },
  cartBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.danger, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: colors.white, fontSize: 10, fontFamily: fonts.bodyBold },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
  price: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.green, marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { backgroundColor: colors.greyLight },
  ordersLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
  ordersLinkText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.green },
});
