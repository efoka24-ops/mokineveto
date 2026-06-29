import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  Pressable,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, fonts } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  /** 'filled' = fond vert pâle (écrans Inscription/Bienvenue) ; 'outline' = bordure (écran Connexion). */
  fieldVariant?: 'filled' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  rightSlot?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  fieldVariant = 'filled',
  icon,
  secure,
  rightSlot,
  containerStyle,
  style,
  ...rest
}: Props) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  const filled = fieldVariant === 'filled';

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: focused
              ? filled
                ? colors.greenPale
                : colors.white
              : filled
              ? colors.greenPale
              : colors.white,
          },
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={20} color={colors.green} style={{ marginRight: spacing.sm }} />
        ) : null}
        <TextInput
          placeholderTextColor={filled ? colors.greenDark + '99' : colors.greyLight}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          underlineColorAndroid="transparent"
          style={[styles.input, { color: filled ? colors.greenDark : colors.ink }, style]}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.green}
            />
          </Pressable>
        ) : (
          rightSlot
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    height: 54,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, paddingVertical: 0 },
});
