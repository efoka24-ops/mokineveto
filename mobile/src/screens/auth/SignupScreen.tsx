import React, { useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Screen, Select, TopBar } from '../../components';
import DocumentField from '../../components/DocumentField';
import { uploadCredential, type PickedFile } from '../../services/credentials';
import { colors, fonts, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { Role } from '../../store/useAuthStore';
import { signUp } from '../../services/auth';
import { toUserMessage } from '../../services/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SignupScreen() {
  const nav = useNavigation<Nav>();
  const [form, setForm] = useState({
    name: '',
    password: '',
    email: '',
    phone: '',
    birthDate: '',
    // Vet fields
    specialty: '',
    gender: '',
    experienceYears: '',
    ordreNumber: '',
    professional: '',
    focus: '',
    interventionZone: '',
    hourlyRate: '',
  });
  const [role, setRole] = useState<Role>('ELEVEUR');
  const [loading, setLoading] = useState(false);
  const [diploma, setDiploma] = useState<PickedFile | null>(null);
  const [orderCard, setOrderCard] = useState<PickedFile | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const isVet = role === 'VETERINAIRE';

  const onSubmit = async () => {
    // Les pièces justificatives conditionnent la validation du compte (SFD §4.1.2) :
    // on bloque avant l'envoi plutôt que de créer un dossier inexaminable.
    if (isVet && (!diploma || !orderCard)) {
      Alert.alert(
        'Pièces manquantes',
        "Le diplôme vétérinaire et la carte de l'Ordre sont requis pour que votre compte puisse être validé."
      );
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        password: form.password,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate,
        role,
      };

      // Add vet-specific fields if registering as vet
      if (isVet) {
        payload.specialty = form.specialty;
        payload.gender = form.gender;
        payload.experienceYears = parseInt(form.experienceYears) || 0;
        payload.ordreNumber = form.ordreNumber;
        payload.professional = form.professional === 'yes';
        payload.focus = form.focus;
        payload.interventionZone = form.interventionZone;
        const rate = parseInt(form.hourlyRate, 10);
        if (Number.isFinite(rate) && rate >= 0) payload.hourlyRate = rate;
      }

      const { token } = await signUp(payload);

      if (isVet && diploma && orderCard) {
        // Le compte est créé ; l'échec du dépôt ne doit pas l'annuler, mais le
        // praticien doit savoir que son dossier reste incomplet.
        try {
          await uploadCredential('DIPLOMA', diploma, token);
          await uploadCredential('ORDER_CARD', orderCard, token);
        } catch (err) {
          Alert.alert(
            'Compte créé, pièces non transmises',
            `${toUserMessage(err)}\n\nReprenez le dépôt depuis votre profil : votre compte ne pourra pas être validé sans ces pièces.`
          );
        }
      }
      // RootNavigator switches to the Main stack reactively once the store's user is set.
    } catch (err) {
      Alert.alert('Inscription impossible', toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen bg={colors.white} scroll>
      <TopBar title="Nouveau Compte" />
      <View style={styles.form}>
        {/* Common Fields */}
        <Input label="Nom" placeholder="Votre nom complet" value={form.name} onChangeText={set('name')} />
        <Input label="Mot De Passe" placeholder="••••••••" secure value={form.password} onChangeText={set('password')} />
        <Input
          label="Email"
          placeholder="example@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.email}
          onChangeText={set('email')}
        />
        <Input
          label="Numéro"
          placeholder="+237 6 00 00 00 00"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={set('phone')}
        />

        {/* Role Selection */}
        <Select
          label="Utilisateur"
          value={role}
          onChange={setRole}
          options={[
            { label: 'Éleveur', value: 'ELEVEUR' },
            { label: 'Vétérinaire', value: 'VETERINAIRE' },
          ]}
        />

        {/* Vet-Specific Fields */}
        {isVet && (
          <>
            <Input
              label="Spécialité"
              placeholder="ex: Médecine bovine"
              value={form.specialty}
              onChangeText={set('specialty')}
            />
            <Select
              label="Genre"
              value={form.gender}
              onChange={set('gender')}
              options={[
                { label: 'Homme', value: 'homme' },
                { label: 'Femme', value: 'femme' },
              ]}
            />
            <Input
              label="Années d'Expérience"
              placeholder="ex: 5"
              keyboardType="number-pad"
              value={form.experienceYears}
              onChangeText={set('experienceYears')}
            />
            <Input
              label="Numéro d'Ordre Professionnel"
              placeholder="ex: ODP-12345"
              value={form.ordreNumber}
              onChangeText={set('ordreNumber')}
            />
            <Select
              label="Professionnel Établi"
              value={form.professional}
              onChange={set('professional')}
              options={[
                { label: 'Oui', value: 'yes' },
                { label: 'Non', value: 'no' },
              ]}
            />
            <Input
              label="Domaine de Focus"
              placeholder="ex: Bovins, Volailles, etc."
              value={form.focus}
              onChangeText={set('focus')}
            />
            <Input
              label="Zone d'Intervention"
              placeholder="ex: Maroua et Diamaré"
              value={form.interventionZone}
              onChangeText={set('interventionZone')}
            />
            <Input
              label="Tarif de Consultation (FCFA)"
              placeholder="ex: 7000"
              keyboardType="number-pad"
              value={form.hourlyRate}
              onChangeText={set('hourlyRate')}
            />

            {/*
              Pièces justificatives (SFD §4.1.2). Sans elles, la validation
              administrateur n'a rien à examiner : elles sont donc exigées avant
              soumission, et non proposées après coup.
            */}
            <Text style={styles.docsTitle}>Pièces justificatives</Text>
            <Text style={styles.docsIntro}>
              Votre compte sera examiné par notre équipe sous 48 heures ouvrées. Ces deux pièces
              sont indispensables à cet examen.
            </Text>
            <DocumentField
              label="Diplôme vétérinaire"
              hint="JPG, PNG ou PDF — 5 Mo maximum"
              value={diploma}
              onChange={setDiploma}
              required
            />
            <DocumentField
              label="Carte de l'Ordre"
              hint="JPG, PNG ou PDF — 5 Mo maximum"
              value={orderCard}
              onChange={setOrderCard}
              required
            />
          </>
        )}

        {/* Common Field (after vet fields) */}
        <Input
          label="Date De Naissance"
          placeholder="DD / MM / YYYY"
          value={form.birthDate}
          onChangeText={set('birthDate')}
        />

        <Button title="S'inscrire" onPress={onSubmit} loading={loading} style={styles.cta} />
        <Text style={styles.or}>ou inscrivez-vous avec</Text>
        <Text style={styles.signin}>
          Vous avez déjà un compte ?{' '}
          <Text style={styles.link} onPress={() => nav.navigate('Login')}>
            Connectez-vous
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.lg },
  docsTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.brown, marginTop: spacing.md },
  docsIntro: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginBottom: spacing.md, lineHeight: 17 },
  cta: { marginTop: spacing.lg },
  or: { textAlign: 'center', color: colors.grey, fontFamily: fonts.body, marginVertical: spacing.lg },
  signin: { textAlign: 'center', fontFamily: fonts.body, color: colors.ink },
  link: { fontFamily: fonts.bodySemiBold, color: colors.green },
});
