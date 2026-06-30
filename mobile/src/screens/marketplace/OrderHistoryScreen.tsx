import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { listOrders, type Order } from '../../services/marketplace';

const STATUS_LABEL: Record<Order['status'], string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};
const STATUS_COLOR: Record<Order['status'], string> = {
  PENDING: colors.star,
  CONFIRMED: colors.green,
  DELIVERED: colors.blue,
  CANCELLED: colors.danger,
};

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOrders()
      .then((res) => setOrders(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen scroll bg={colors.white}>
      <TopBar title="Mes commandes" tint={colors.green} />

      {loading ? <Text style={styles.muted}>Chargement…</Text> : null}

      {orders.map((o) => (
        <View key={o.id} style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.supplier}>{o.supplier?.name || 'Commande'}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLOR[o.status] }]}>
              <Text style={styles.badgeText}>{STATUS_LABEL[o.status]}</Text>
            </View>
          </View>
          {(o.items || []).map((it) => (
            <Text key={it.id} style={styles.item}>
              {it.qty} × {it.product?.name || 'Produit'} — {(it.unitPrice * it.qty).toLocaleString('fr-FR')} XAF
            </Text>
          ))}
          <Text style={styles.total}>Total : {o.totalAmount.toLocaleString('fr-FR')} XAF</Text>
        </View>
      ))}

      {!loading && orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={48} color={colors.greenPale} />
          <Text style={styles.muted}>Aucune commande pour l'instant.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.soft },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  supplier: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white },
  item: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginTop: 2 },
  total: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.green, marginTop: spacing.sm },
});
