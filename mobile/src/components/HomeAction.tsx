import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, radii, shadow, spacing } from '../theme';

export interface HomeActionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  /** Compteur facultatif : nombre d'animaux, de rendez-vous, de messages non lus… */
  badge?: number;
  /** Habillage d'alerte, pour l'urgence et les animaux malades. */
  tone?: 'default' | 'danger';
  onPress: () => void;
}

/**
 * Bouton principal du tableau de bord éleveur (SFD §4.2).
 *
 * « Accueil visuel avec icônes larges. » Le profil utilisateur cible est
 * faiblement alphabétisé : l'icône porte le sens, le libellé ne fait que le
 * confirmer. D'où une icône de 40 dp et une cible tactile très au-delà des
 * 48 dp minimum exigés par la SFD §8.2.
 */
export default function HomeAction({ icon, label, badge, tone = 'default', onPress }: HomeActionProps) {
  const danger = tone === 'danger';

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, danger && styles.tileDanger, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge !== undefined ? `${label}, ${badge}` : label}
    >
      <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
        <MaterialCommunityIcons
          name={icon}
          size={40}
          color={danger ? colors.white : colors.brown}
        />
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, danger && styles.labelDanger]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    // Deux colonnes, quelle que soit la largeur d'écran.
    width: '48%',
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    ...shadow.card,
  },
  tileDanger: { backgroundColor: colors.danger },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconWrapDanger: { backgroundColor: '#ffffff33' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 5,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.brown,
    textAlign: 'center',
    lineHeight: 18,
  },
  labelDanger: { color: colors.white },
});
