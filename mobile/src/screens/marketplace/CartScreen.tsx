import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { useCartStore } from '../../store/useCartStore';
import { createOrder } from '../../services/marketplace';
import { initOrderPayment, checkPaymentStatus } from '../../services/payment';
import { usePaymentStore } from '../../store/usePaymentStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const nav = useNavigation<Nav>();
  const { lines, setQty, total, clear, supplierId } = useCartStore();
  const { method, phone } = usePaymentStore();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const checkout = async () => {
    const sid = supplierId();
    if (!sid || lines.length === 0) return;

    try {
      setLoading(true);
      setFeedback(null);

      const orderRes = await createOrder(
        sid,
        lines.map((l) => ({ productId: l.product.id, qty: l.qty }))
      );
      if (!orderRes.data?.id) throw new Error('Order creation failed');

      const payRes = await initOrderPayment({ orderId: orderRes.data.id, method, phone });
      if (!payRes.paymentId) throw new Error('Payment init failed');

      let success = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const status = await checkPaymentStatus(payRes.paymentId);
        if (status.data?.status === 'SUCCEEDED') { success = true; break; }
        if (status.data?.status === 'FAILED') break;
      }

      if (success) {
        clear();
        setFeedback('✅ Commande confirmée et payée.');
        setTimeout(() => nav.navigate('OrderHistory'), 800);
      } else {
        setFeedback('❌ Paiement non confirmé. La commande reste en attente.');
      }
    } catch (_err) {
      setFeedback('❌ Erreur lors de la commande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      bg={colors.white}
      footer={
        lines.length > 0 ? (
          <Button title={`Payer ${total().toLocaleString('fr-FR')} XAF`} loading={loading} onPress={checkout} />
        ) : undefined
      }
    >
      <TopBar title="Mon panier" tint={colors.green} />

      {lines.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={48} color={colors.greenPale} />
          <Text style={styles.muted}>Votre panier est vide.</Text>
        </View>
      ) : (
        lines.map((l) => (
          <View key={l.product.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{l.product.name}</Text>
              <Text style={styles.price}>{l.product.price.toLocaleString('fr-FR')} XAF / {l.product.unit}</Text>
            </View>
            <View style={styles.qtyRow}>
              <Pressable onPress={() => setQty(l.product.id, l.qty - 1)} style={styles.qtyBtn}>
                <Ionicons name="remove" size={16} color={colors.green} />
              </Pressable>
              <Text style={styles.qty}>{l.qty}</Text>
              <Pressable onPress={() => setQty(l.product.id, l.qty + 1)} style={styles.qtyBtn}>
                <Ionicons name="add" size={16} color={colors.green} />
              </Pressable>
            </View>
          </View>
        ))
      )}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.md },
  muted: { fontFamily: fonts.body, color: colors.grey },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.greenPale },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  price: { fontFamily: fonts.body, fontSize: 13, color: colors.green, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.greenPale, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, minWidth: 20, textAlign: 'center' },
  feedback: { fontFamily: fonts.bodyMedium, fontSize: 14, textAlign: 'center', marginTop: spacing.lg },
});
