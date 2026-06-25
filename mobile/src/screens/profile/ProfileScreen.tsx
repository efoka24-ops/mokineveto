import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [confirm, setConfirm] = useState(false);

  const items: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: 'person-outline', label: t('profile.edit'), onPress: () => nav.navigate('EditProfile') },
    { icon: 'heart-outline', label: t('profile.favorites'), onPress: () => nav.navigate('Favorites') },
    { icon: 'wallet-outline', label: t('profile.paymentMethod'), onPress: () => nav.navigate('PaymentMethods') },
    { icon: 'lock-closed-outline', label: t('profile.privacy'), onPress: () => nav.navigate('Privacy') },
    { icon: 'settings-outline', label: t('profile.settings'), onPress: () => nav.navigate('Settings') },
    { icon: 'help-circle-outline', label: t('profile.help'), onPress: () => nav.navigate('Help') },
    { icon: 'log-out-outline', label: t('profile.logout'), onPress: () => setConfirm(true) },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>{t('profile.title')}</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Image source={{ uri: user?.avatarUrl ?? 'https://i.pravatar.cc/150?u=mv' }} style={styles.avatar} />
          <Text style={styles.name}>{user?.name ?? 'Utilisateur'}</Text>
        </View>

        {items.map((it) => (
          <Pressable key={it.label} style={styles.row} onPress={it.onPress}>
            <View style={styles.iconCircle}>
              <Ionicons name={it.icon} size={20} color={colors.white} />
            </View>
            <Text style={styles.rowLabel}>{it.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.blueSoft} />
          </Pressable>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal transparent visible={confirm} animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('profile.logout')}</Text>
            <Text style={styles.sheetBody}>{t('profile.logoutConfirm')}</Text>
            <View style={styles.sheetActions}>
              <Button title={t('common.cancel')} variant="outline" style={{ flex: 1 }} onPress={() => setConfirm(false)} />
              <View style={{ width: spacing.md }} />
              <Button title={t('common.yes')} style={{ flex: 1 }} onPress={() => { setConfirm(false); signOut(); }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.brown, textAlign: 'center', paddingVertical: spacing.lg },
  content: { paddingHorizontal: spacing.xl },
  head: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  name: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.brown },
  backdrop: { flex: 1, backgroundColor: '#0007', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl, paddingBottom: spacing.xxl, ...shadow.card },
  sheetTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.green, textAlign: 'center' },
  sheetBody: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, textAlign: 'center', marginVertical: spacing.lg },
  sheetActions: { flexDirection: 'row' },
});
