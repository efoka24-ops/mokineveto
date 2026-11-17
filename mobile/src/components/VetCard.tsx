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
  const availabilityColor =
    vet.availability === 'DISPONIBLE' ? '#3DE07A' : vet.availability === 'OCCUPE' ? '#F4C542' : '#E86A6A';
  const availabilityLabel =
    vet.availability === 'DISPONIBLE' ? 'Disponible' : vet.availability === 'OCCUPE' ? 'Occupé' : 'Absent';
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View>
        <Image source={{ uri: vet.photo }} style={styles.avatar} />
        {vet.availability && (
          <View style={[styles.availDot, { backgroundColor: availabilityColor }]} accessibilityLabel={availabilityLabel} />
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {vet.name}
          </Text>
          {vet.certifiedBadge && (
            <Ionicons name="checkmark-circle" size={15} color="#FFD873" accessibilityLabel="Vétérinaire certifié MokineVeto" />
          )}
        </View>
        <Text style={styles.specialty} numberOfLines={1}>
          {vet.specialty}{vet.distanceKm !== undefined ? ` · ${vet.distanceKm} km` : ''}
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
  availDot: {
    position: 'absolute',
    bottom: 2,
    right: spacing.md + 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
