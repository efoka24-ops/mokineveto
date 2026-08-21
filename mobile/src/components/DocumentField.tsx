import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, fonts, radii, spacing } from '../theme';
import { MAX_CREDENTIAL_BYTES, type PickedFile } from '../services/credentials';

interface Props {
  label: string;
  /** Précision affichée sous le libellé, ex. formats et taille acceptés. */
  hint?: string;
  value: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
  required?: boolean;
}

function humanSize(bytes?: number): string {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Champ de dépôt d'une pièce justificative (SFD §4.1.2).
 * Le plafond de 5 Mo est vérifié dès la sélection : sur une connexion rurale,
 * laisser partir un envoi voué à l'échec coûte cher à l'utilisateur.
 */
export default function DocumentField({ label, hint, value, onChange, required }: Props) {
  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      if (asset.size !== undefined && asset.size > MAX_CREDENTIAL_BYTES) {
        Alert.alert(
          'Fichier trop volumineux',
          `« ${asset.name} » fait ${humanSize(asset.size)}. La taille maximale est de 5 Mo.`
        );
        return;
      }

      onChange({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size ?? undefined,
      });
    } catch (_err) {
      Alert.alert('Sélection impossible', "Le fichier n'a pas pu être ouvert. Réessayez.");
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      {value ? (
        <View style={styles.filled}>
          <Ionicons
            name={value.mimeType === 'application/pdf' ? 'document-text' : 'image'}
            size={22}
            color={colors.greenDark}
          />
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>{value.name}</Text>
            <Text style={styles.fileSize}>{humanSize(value.size)}</Text>
          </View>
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Retirer ${value.name}`}
            style={styles.remove}
          >
            <Ionicons name="close" size={20} color={colors.danger} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.empty, pressed && styles.pressed]}
          onPress={pick}
          accessibilityRole="button"
          accessibilityLabel={`Déposer ${label}`}
        >
          <Ionicons name="cloud-upload-outline" size={22} color={colors.green} />
          <Text style={styles.emptyText}>Choisir un fichier</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink, marginBottom: 2 },
  required: { color: colors.danger },
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.grey, marginBottom: spacing.sm },
  // 56 dp : au-delà du minimum de 48 dp exigé par la SFD §8.2.
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.greenPaleBorder,
    backgroundColor: colors.greenPale,
  },
  pressed: { opacity: 0.8 },
  emptyText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.greenDark },
  filled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radii.md,
    backgroundColor: colors.greenPale,
    paddingHorizontal: spacing.md,
  },
  fileInfo: { flex: 1 },
  fileName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  fileSize: { fontFamily: fonts.body, fontSize: 11, color: colors.grey },
  remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
