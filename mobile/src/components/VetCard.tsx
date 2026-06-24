import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, shadow, spacing } from '../theme';
import type { Vet } from '../services/vets';

type Variant = 'green' | 'brown';

interface Props {
  vet: Vet;
  variant?: Variant;
  favorite?: boolean;
  onPress?: () => void;
  onInfo?: () => void;
  onToggleFavorite?: () => void;
}

/** Carte vétérinaire de l'annuaire (variantes verte / brune du Figma). */
export default function VetCard({
  vet,
  variant = 'green',
  favorite,
  onPress,
  onInfo,
  onToggleFavorite,
}: Props) {
  const bg = variant === 'green' ? colors.green : colors.brown;
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Image source={{ uri: vet.photo }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {vet.name}
        </Text>
        <Text style={styles.specialty} numberOfLines={1}>
          {vet.specialty}
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.infoBtn} onPress={onInfo ?? onPress}>
            <Text style={styles.infoText}>Info</Text>
          </Pressable>
          <IconChip icon="calendar-outline" onPress={onPress} />
          <IconChip icon="information-circle-outline" onPress={onInfo ?? onPress} />
          <IconChip icon="help-outline" />
          <IconChip
            icon={favorite ? 'heart' : 'heart-outline'}
            tint={favorite ? colors.green : colors.brown}
            onPress={onToggleFavorite}
          />
        </View>
      </View>
    </View>
  );
}

function IconChip({
  icon,
  tint = colors.brown,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.chip} onPress={onPress} hitSlop={6}>
      <Ionicons name={icon} size={15} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.soft,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginRight: spacing.md },
  info: { flex: 1 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.white },
  specialty: { fontFamily: fonts.body, fontSize: 12, color: '#ffffffcc', marginBottom: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoBtn: {
    backgroundColor: colors.green,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#ffffff55',
  },
  infoText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.white },
  chip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
