import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { listMyReceivedOrders, updateOrderStatus, type Order } from '../../services/marketplace';
import { toUserMessage } from '../../services/api';

const STATUS_LABEL: Record<Order['status'], string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

/** Prochaine action possible depuis chaque état, dans le cycle normal de la commande. */
const NEXT_ACTION: Partial<Record<Order['status'], { label: string; next: Order['status'] }>> = {
  PENDING: { label: 'Confirmer', next: 'CONFIRMED' },
  CONFIRMED: { label: 'Marquer livrée', next: 'DELIVERED' },
};

/**
 * Commandes reçues par le fournisseur connecté, avec l'action de progression
 * de statut appropriée (confirmer → livrer), et la possibilité d'annuler
 * tant que la commande n'est pas déjà livrée.
 */
export default function SupplierOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listMyReceivedOrders()
      .then((res) => setOrders(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyStatus = async (order: Order, status: Order['status']) => {
    setUpdating(order.id);
    try {
      await updateOrderStatus(order.id, status);
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status } : o)));
    } catch (err) {
      Alert.alert('Action impossible', toUserMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const onCancel = (order: Order) => {
    Alert.alert('Annuler cette commande ?', 'L\'éleveur sera notifié de l\'annulation.', [
      { text: 'Retour', style: 'cancel' },
      { text: 'Annuler la commande', style: 'destructive', onPress: () => applyStatus(order, 'CANCELLED') },
    ]);
  };

  return (
    <Screen scroll bg={colors.white}>
      <TopBar title="Commandes reçues" />

      {loading && <Text style={styles.muted}>Chargement…</Text>}
      {!loading && orders.length === 0 && <Text style={styles.muted}>Aucune commande reçue pour l'instant.</Text>}

      {orders.map((o) => {
        const action = NEXT_ACTION[o.status];
        const cancellable = o.status === 'PENDING' || o.status === 'CONFIRMED';
        return (
          <View key={o.id} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.buyer}>{o.buyerName ?? 'Éleveur'}</Text>
              <View style={[styles.statusPill, styles[`pill_${o.status}` as const]]}>
                <Text style={styles.statusPillText}>{STATUS_LABEL[o.status]}</Text>
              </View>
            </View>
            {o.buyerPhone && <Text style={styles.phone}>{o.buyerPhone}</Text>}

            {(o.items ?? []).map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>{it.qty} × {it.productName ?? 'Produit'}</Text>
                <Text style={styles.itemPrice}>{(it.qty * it.unitPrice).toLocaleString('fr-FR')} FCFA</Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{o.totalAmount.toLocaleString('fr-FR')} FCFA</Text>
            </View>

            {(action || cancellable) && (
              <View style={styles.actions}>
                {cancellable && (
                  <Pressable style={styles.cancelBtn} onPress={() => onCancel(o)} disabled={updating === o.id}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </Pressable>
                )}
                {action && (
                  <Pressable
                    style={styles.confirmBtn}
                    onPress={() => applyStatus(o, action.next)}
                    disabled={updating === o.id}
                  >
                    <Text style={styles.confirmBtnText}>{action.label}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.soft },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buyer: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  phone: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill },
  statusPillText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white },
  pill_PENDING: { backgroundColor: colors.star },
  pill_CONFIRMED: { backgroundColor: colors.blue },
  pill_DELIVERED: { backgroundColor: colors.green },
  pill_CANCELLED: { backgroundColor: colors.danger },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  itemName: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  itemPrice: { fontFamily: fonts.body, fontSize: 13, color: colors.grey },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.brown },
  totalValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.green },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.danger, alignItems: 'center' },
  cancelBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.danger },
  confirmBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.green, alignItems: 'center' },
  confirmBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.white },
});
