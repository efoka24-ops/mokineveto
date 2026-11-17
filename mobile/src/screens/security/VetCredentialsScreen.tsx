import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Screen, TopBar } from '../../components';
import DocumentField from '../../components/DocumentField';
import { colors, fonts, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import {
  CREDENTIAL_LABEL,
  listCredentials,
  uploadCredential,
  type CredentialType,
  type PickedFile,
  type VetCredential,
} from '../../services/credentials';
import { toUserMessage } from '../../services/api';

/**
 * Dépôt des pièces justificatives, accessible à tout moment après
 * l'inscription (SFD §4.1.2) — pas seulement pendant le formulaire initial :
 * un dépôt échoué à l'inscription, ou simplement différé, laissait jusqu'ici
 * le praticien sans aucun moyen de compléter son dossier.
 */
export default function VetCredentialsScreen() {
  const nav = useNavigation<any>();
  const token = useAuthStore((s) => s.token);

  const [existing, setExisting] = useState<VetCredential[]>([]);
  const [diploma, setDiploma] = useState<PickedFile | null>(null);
  const [orderCard, setOrderCard] = useState<PickedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<CredentialType | null>(null);

  const load = useCallback(async () => {
    try {
      setExisting(await listCredentials());
    } catch {
      // liste vide en cas d'échec : le dépôt reste possible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uploaded = (type: CredentialType) => existing.find((c) => c.type === type);

  const submit = async (type: CredentialType, file: PickedFile | null) => {
    if (!file || !token) return;
    setSaving(type);
    try {
      await uploadCredential(type, file, token);
      if (type === 'DIPLOMA') setDiploma(null);
      else setOrderCard(null);
      await load();
      Alert.alert('Pièce déposée', `${CREDENTIAL_LABEL[type]} envoyé avec succès.`);
    } catch (err) {
      Alert.alert('Dépôt impossible', toUserMessage(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Mes pièces justificatives" />
      <View style={styles.intro}>
        <Text style={styles.introText}>
          Le diplôme vétérinaire et la carte de l'Ordre sont indispensables à la validation de
          votre compte par notre équipe. Un nouveau dépôt remplace le précédent.
        </Text>
      </View>

      {(['DIPLOMA', 'ORDER_CARD'] as const).map((type) => {
        const done = uploaded(type);
        const picked = type === 'DIPLOMA' ? diploma : orderCard;
        return (
          <View key={type} style={styles.block}>
            {done && !picked && (
              <View style={styles.doneBanner}>
                <Text style={styles.doneText}>✓ {CREDENTIAL_LABEL[type]} déjà déposé{done.originalName ? ` — ${done.originalName}` : ''}</Text>
              </View>
            )}
            <DocumentField
              label={done && !picked ? `Remplacer : ${CREDENTIAL_LABEL[type]}` : CREDENTIAL_LABEL[type]}
              hint="JPG, PNG ou PDF — 5 Mo maximum"
              value={picked}
              onChange={type === 'DIPLOMA' ? setDiploma : setOrderCard}
            />
            {picked && (
              <Button
                title="Envoyer"
                loading={saving === type}
                onPress={() => submit(type, picked)}
                style={styles.sendBtn}
              />
            )}
          </View>
        );
      })}

      <Button title="Retour" onPress={() => nav.goBack()} style={styles.backBtn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: spacing.md, marginBottom: spacing.lg },
  introText: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, lineHeight: 19 },
  block: { marginBottom: spacing.lg },
  doneBanner: {
    backgroundColor: colors.greenPale,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  doneText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.greenDark },
  sendBtn: { marginTop: -spacing.sm, marginBottom: spacing.md },
  backBtn: { marginTop: spacing.lg, backgroundColor: colors.greenPale },
});
