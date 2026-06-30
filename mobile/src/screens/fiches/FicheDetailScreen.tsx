import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { getFiche, FICHE_PRICE, type Fiche } from '../../services/fiches';
import { initFicheUnlockPayment, checkPaymentStatus } from '../../services/payment';
import { usePaymentStore } from '../../store/usePaymentStore';
import type { RootStackParamList } from '../../navigation/types';

type Rt = RouteProp<RootStackParamList, 'FicheDetail'>;

export default function FicheDetailScreen() {
  const { id } = useRoute<Rt>().params;
  const [fiche, setFiche] = useState<Fiche | undefined>();
  const [unlocked, setUnlocked] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { method, phone } = usePaymentStore();
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const res = await getFiche(id);
      setFiche(res.fiche);
      setUnlocked(res.unlocked);
    } catch (_err) {
      console.warn('[FicheDetailScreen] Failed to load fiche');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [id]);

  if (fetching) {
    return (
      <Screen>
        <TopBar title="Fiche" />
        <Text style={styles.muted}>Chargement…</Text>
      </Screen>
    );
  }

  if (!fiche) {
    return (
      <Screen>
        <TopBar title="Fiche" />
        <Text style={styles.muted}>Fiche introuvable.</Text>
      </Screen>
    );
  }

  const onConsult = async () => {
    try {
      setLoading(true);
      const initRes = await initFicheUnlockPayment({
        ficheId: fiche.id,
        method,
        phone: phone || undefined,
      });

      if (!initRes.paymentId) throw new Error('Payment init failed');

      let success = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const statusRes = await checkPaymentStatus(initRes.paymentId);
        if (statusRes.data?.status === 'SUCCEEDED') {
          success = true;
          break;
        }
        if (statusRes.data?.status === 'FAILED') break;
      }

      if (success) {
        await refresh();
      }
    } catch (_err) {
      console.warn('[FicheDetailScreen] Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll bg={colors.white}>
      <TopBar title={fiche.name} />

      <View style={styles.tags}>
        {fiche.species.map((s) => (
          <View key={s} style={styles.speciesTag}><Text style={styles.speciesText}>{s}</Text></View>
        ))}
        {fiche.contagious ? (
          <View style={styles.contagious}><Text style={styles.contagiousText}>Contagieux</Text></View>
        ) : null}
      </View>

      <Text style={styles.desc}>{fiche.description}</Text>

      {unlocked ? (
        <>
          <Section title="Observations terrain" body={fiche.fieldObs} />
          <Section title="Prévention" body={fiche.prevention} />
          <Section title="Information vétérinaire" body={fiche.vetInfo} />
          <View style={styles.noDownload}>
            <Ionicons name="eye-off-outline" size={14} color={colors.grey} />
            <Text style={styles.noDownloadText}>Consultation en ligne uniquement — non téléchargeable.</Text>
          </View>
        </>
      ) : (
        <View style={styles.paywall}>
          <Ionicons name="lock-closed" size={40} color={colors.green} />
          <Text style={styles.paywallTitle}>Contenu réservé</Text>
          <Text style={styles.paywallText}>
            Consultez la fiche complète (observations terrain, prévention, infos vétérinaire) pour {FICHE_PRICE} FCFA.
            Paiement Mobile Money · consultation non téléchargeable.
          </Text>
          <Button
            title={`Consulter pour ${FICHE_PRICE} FCFA`}
            loading={loading}
            onPress={onConsult}
            style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
          />
        </View>
      )}
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xxl },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  speciesTag: { backgroundColor: colors.greenPale, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  speciesText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.greenDark },
  contagious: { backgroundColor: colors.danger, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  contagiousText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.white },
  desc: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 21 },
  paywall: { alignItems: 'center', backgroundColor: colors.bgBlue, borderRadius: radii.lg, padding: spacing.xl, marginTop: spacing.xl, gap: spacing.sm },
  paywallTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.brown },
  paywallText: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, textAlign: 'center', lineHeight: 19 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.green, marginBottom: spacing.xs },
  sectionBody: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, lineHeight: 21 },
  noDownload: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  noDownloadText: { fontFamily: fonts.body, fontSize: 12, color: colors.grey },
});
