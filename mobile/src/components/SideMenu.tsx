import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../theme';

export interface SideMenuItem {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  badge?: number;
  tone?: 'danger';
  onPress: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: SideMenuItem[];
}

/**
 * Menu latéral regroupant les fonctionnalités secondaires du tableau de bord
 * (éleveur/vétérinaire), pour garder l'écran d'accueil au strict essentiel
 * ("en un coup d'œil") plutôt qu'une grille de boutons en vrac.
 */
export default function SideMenu({ visible, onClose, title, items }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView style={styles.panel} edges={['top', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer le menu">
              <Ionicons name="close" size={24} color={colors.brown} />
            </Pressable>
          </View>
          {items.map((item) => (
            <Pressable
              key={item.label}
              style={styles.row}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <View style={[styles.iconWrap, item.tone === 'danger' && styles.iconWrapDanger]}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={item.tone === 'danger' ? colors.white : colors.green}
                />
              </View>
              <Text style={[styles.label, item.tone === 'danger' && styles.labelDanger]}>{item.label}</Text>
              {!!item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.grey} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '82%',
    maxWidth: 340,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 19, color: colors.brown },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: { backgroundColor: colors.danger },
  label: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
  labelDanger: { color: colors.danger, fontFamily: fonts.bodySemiBold },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
});
