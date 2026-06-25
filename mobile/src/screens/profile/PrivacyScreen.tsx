import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';

export default function PrivacyScreen() {
  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Politique De Confidentialité" />
      <Text style={styles.update}>Dernière mise à jour : 14/08/2024</Text>
      <Text style={styles.body}>
        MokineVeto respecte la confidentialité des données des éleveurs et des vétérinaires. Les informations
        relatives aux exploitations, aux animaux et aux consultations sont stockées de manière sécurisée et ne
        sont partagées qu'avec le vétérinaire concerné par une consultation.
        {'\n\n'}
        Les données sanitaires peuvent être remontées de façon anonymisée aux autorités sanitaires à des fins de
        surveillance épidémiologique, sans permettre l'identification individuelle de l'éleveur.
      </Text>

      <Text style={styles.h2}>Conditions d'utilisation</Text>
      {[
        "L'assistant de pré-analyse fournit une orientation et non un diagnostic ; l'avis final relève du vétérinaire.",
        'Les fiches techniques sont consultables en ligne (100 FCFA / consultation) et ne sont pas téléchargeables.',
        'Les paiements sont traités par Mobile Money via des prestataires agréés.',
        "L'inscription des vétérinaires est soumise à la vérification de l'Ordre des vétérinaires.",
      ].map((t, i) => (
        <Text key={i} style={styles.li}>{i + 1}. {t}</Text>
      ))}
      <Text style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  update: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.green, marginBottom: spacing.md },
  body: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 20 },
  h2: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.green, marginTop: spacing.xl, marginBottom: spacing.md },
  li: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 20, marginBottom: spacing.sm },
});
