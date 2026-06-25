import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, radii, spacing } from '../../theme';

const FAQ = [
  { q: "L'application fonctionne-t-elle sans connexion ?", a: "Oui, les fiches et la saisie fonctionnent hors-ligne avec synchronisation automatique au retour du réseau." },
  { q: 'Le chatbot remplace-t-il le vétérinaire ?', a: "Non. Il fournit une orientation ; le diagnostic final relève du vétérinaire." },
  { q: 'Comment payer une consultation ?', a: 'Par Orange Money ou MTN MoMo, directement dans l\'application.' },
];

const CONTACTS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'headset', label: 'Service Clients' },
  { icon: 'globe-outline', label: 'Site web' },
  { icon: 'logo-whatsapp', label: 'WhatsApp' },
  { icon: 'logo-facebook', label: 'Facebook' },
  { icon: 'logo-instagram', label: 'Instagram' },
];

export default function HelpScreen() {
  const nav = useNavigation<any>();
  const [tab, setTab] = useState<'faq' | 'contact'>('contact');
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Centre d'aide</Text>
        <Text style={styles.headerSub}>Comment pouvons-nous vous aider ?</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.grey} />
          <TextInput placeholder="Recherche…" placeholderTextColor={colors.grey} style={styles.searchInput} />
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'faq' && styles.tabActive]} onPress={() => setTab('faq')}>
          <Text style={[styles.tabText, tab === 'faq' && styles.tabTextActive]}>FAQ</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'contact' && styles.tabActive]} onPress={() => setTab('contact')}>
          <Text style={[styles.tabText, tab === 'contact' && styles.tabTextActive]}>Contactez-nous</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {tab === 'contact'
          ? CONTACTS.map((c) => (
              <Pressable key={c.label} style={styles.contactRow}>
                <View style={styles.contactIcon}>
                  <Ionicons name={c.icon} size={18} color={colors.white} />
                </View>
                <Text style={styles.contactLabel}>{c.label}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.green} />
              </Pressable>
            ))
          : FAQ.map((f, i) => (
              <Pressable key={i} style={styles.faqItem} onPress={() => setOpen(open === i ? null : i)}>
                <View style={styles.faqHead}>
                  <Text style={styles.faqQ}>{f.q}</Text>
                  <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.green} />
                </View>
                {open === i ? <Text style={styles.faqA}>{f.a}</Text> : null}
              </Pressable>
            ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { backgroundColor: colors.green, padding: spacing.xl, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  back: { position: 'absolute', top: spacing.lg, left: spacing.lg },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.white, textAlign: 'center' },
  headerSub: { fontFamily: fonts.body, fontSize: 13, color: '#ffffffcc', textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radii.pill, paddingHorizontal: spacing.lg, height: 46 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  tabs: { flexDirection: 'row', gap: spacing.md, padding: spacing.xl },
  tab: { flex: 1, backgroundColor: colors.greenPale, borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.green },
  tabText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.greenDark },
  tabTextActive: { color: colors.white },
  body: { paddingHorizontal: spacing.xl },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  contactIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
  faqItem: { backgroundColor: colors.bgBlue, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  faqA: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginTop: spacing.sm, lineHeight: 19 },
});
