import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing } from '../theme';

interface Props {
  title?: string;
  /** Couleur du titre et du chevron (défaut: brun). */
  tint?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  showBack?: boolean;
  style?: ViewStyle;
}

export default function TopBar({
  title,
  tint = colors.brown,
  onBack,
  right,
  showBack = true,
  style,
}: Props) {
  const nav = useNavigation<any>();
  const handleBack = onBack ?? (() => nav.canGoBack() && nav.goBack());
  return (
    <View style={[styles.bar, style]}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable onPress={handleBack} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={tint} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.title, { color: tint }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    marginBottom: spacing.md,
  },
  side: { width: 40, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 20,
  },
});
