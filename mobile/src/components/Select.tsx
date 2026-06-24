import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing, shadow } from '../theme';

interface Option<T extends string> {
  label: string;
  value: T;
}

interface Props<T extends string> {
  label?: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}

/** Liste déroulante simple (fond vert pâle) — design Figma "Utilisateur". */
export default function Select<T extends string>({ label, value, options, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={styles.value}>{current?.label ?? '—'}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.green} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {options.map((o) => (
              <Pressable
                key={o.value}
                style={styles.option}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, o.value === value && styles.optionActive]}>
                  {o.label}
                </Text>
                {o.value === value ? (
                  <Ionicons name="checkmark" size={18} color={colors.green} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink, marginBottom: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.greenPale,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    height: 54,
  },
  value: { fontFamily: fonts.body, fontSize: 15, color: colors.greenDark },
  backdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: spacing.xxl },
  sheet: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.sm, ...shadow.card },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  optionText: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  optionActive: { fontFamily: fonts.bodySemiBold, color: colors.green },
});
