import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import {
  listMyProducts,
  createMyProduct,
  updateMyProduct,
  deleteMyProduct,
  type Product,
} from '../../services/marketplace';
import { toUserMessage } from '../../services/api';

/**
 * Gestion des produits publiés par le fournisseur connecté : ajout, retrait
 * temporaire (active) et suppression du catalogue vu par les éleveurs.
 */
export default function SupplierProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', price: '', unit: '' });

  const load = useCallback(() => {
    setLoading(true);
    listMyProducts()
      .then((res) => setProducts(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onCreate = async () => {
    const price = parseInt(form.price, 10);
    if (!form.name.trim() || !form.category.trim() || !form.unit.trim() || !Number.isFinite(price) || price <= 0) {
      Alert.alert('Champs incomplets', 'Renseignez le nom, la catégorie, l\'unité et un prix valide.');
      return;
    }
    setSaving(true);
    try {
      await createMyProduct({ name: form.name.trim(), category: form.category.trim(), unit: form.unit.trim(), price });
      setForm({ name: '', category: '', price: '', unit: '' });
      setShowForm(false);
      load();
    } catch (err) {
      Alert.alert('Ajout impossible', toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (p: Product) => {
    setProducts((list) => list.map((it) => (it.id === p.id ? { ...it, active: !it.active } : it)));
    try {
      await updateMyProduct(p.id, { active: !p.active });
    } catch {
      load();
    }
  };

  const onDelete = (p: Product) => {
    Alert.alert('Retirer ce produit ?', `« ${p.name} » ne sera plus visible des éleveurs.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMyProduct(p.id);
            load();
          } catch (err) {
            Alert.alert('Action impossible', toUserMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll bg={colors.white}>
      <TopBar
        title="Mes produits"
        right={
          <Pressable onPress={() => setShowForm((v) => !v)} style={styles.addBtn}>
            <Ionicons name={showForm ? 'close' : 'add'} size={22} color={colors.white} />
          </Pressable>
        }
      />

      {showForm && (
        <View style={styles.form}>
          <Input label="Nom du produit" placeholder="ex: Vitamine B12" value={form.name} onChangeText={set('name')} />
          <Input label="Catégorie" placeholder="ex: Compléments" value={form.category} onChangeText={set('category')} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Prix (FCFA)" placeholder="ex: 2500" keyboardType="number-pad" value={form.price} onChangeText={set('price')} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Unité" placeholder="ex: flacon" value={form.unit} onChangeText={set('unit')} />
            </View>
          </View>
          <Button title="Publier le produit" onPress={onCreate} loading={saving} />
        </View>
      )}

      {loading && <Text style={styles.muted}>Chargement…</Text>}

      {!loading && products.length === 0 && !showForm && (
        <Text style={styles.muted}>Aucun produit publié pour l'instant.</Text>
      )}

      {products.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{p.name}</Text>
            <Text style={styles.meta}>{p.category} · {p.unit}</Text>
            <Text style={styles.price}>{p.price.toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <View style={styles.cardActions}>
            <Switch value={p.active !== false} onValueChange={() => onToggleActive(p)} trackColor={{ true: colors.green }} />
            <Pressable onPress={() => onDelete(p)} style={styles.trashBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      ))}

      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  form: { backgroundColor: colors.bgBlue, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
  price: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.green, marginTop: 4 },
  cardActions: { alignItems: 'center', gap: spacing.sm },
  trashBtn: { padding: 4 },
});
