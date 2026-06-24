import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radii, spacing, fonts } from '../theme';

type Variant = 'green' | 'brown' | 'blue' | 'outline' | 'ghost';
type Size = 'lg' | 'md' | 'sm';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const BG: Record<Variant, string> = {
  green: colors.green,
  brown: colors.brown,
  blue: colors.blue,
  outline: 'transparent',
  ghost: 'transparent',
};

const FG: Record<Variant, string> = {
  green: colors.white,
  brown: colors.white,
  blue: colors.white,
  outline: colors.brown,
  ghost: colors.green,
};

const HEIGHT: Record<Size, number> = { lg: 56, md: 48, sm: 40 };

export default function Button({
  title,
  onPress,
  variant = 'green',
  size = 'lg',
  disabled,
  loading,
  style,
  textStyle,
}: Props) {
  const isFlat = variant === 'outline' || variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          backgroundColor: BG[variant],
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: colors.brown,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        isFlat && styles.flat,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <Text style={[styles.text, { color: FG[variant] }, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  flat: { paddingHorizontal: spacing.sm },
  text: { fontFamily: fonts.bodySemiBold, fontSize: 16 },
});
