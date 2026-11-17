import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, fonts, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';
import { updateUserProfile } from '../../services/auth';
import { toUserMessage } from '../../services/api';

export default function EditProfileScreen() {
  const nav = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [birth, setBirth] = useState(user?.birthDate ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Nom invalide', 'Le nom doit comporter au moins 2 caractères.');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile({ name: name.trim(), birthDate: birth || undefined });
      nav.goBack();
    } catch (err) {
      Alert.alert('Échec de la mise à jour', toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen bg={colors.white} scroll footer={<Button title="Mettre à jour" loading={saving} onPress={save} />}>
      <TopBar
        title="Profil"
        right={<Pressable onPress={() => nav.navigate('Settings')}><Ionicons name="settings-outline" size={22} color={colors.green} /></Pressable>}
      />
      <View style={styles.avatarWrap}>
        <Image source={{ uri: user?.avatarUrl ?? 'https://i.pravatar.cc/150?u=mv' }} style={styles.avatar} />
        <Pressable style={styles.editBadge}>
          <Ionicons name="pencil" size={14} color={colors.white} />
        </Pressable>
      </View>

      <Input label="Nom" value={name} onChangeText={setName} />

      {/* Téléphone et e-mail ne sont pas modifiables depuis cet écran : le
          téléphone est l'identifiant du compte (SFD §4.1.4, immuable), et
          l'API n'accepte aucune modification d'e-mail pour l'instant. Les
          afficher comme éditables sans jamais les enregistrer serait
          trompeur — d'où le bug initial. */}
      <Input label="Téléphone" value={user?.phone ?? ''} editable={false} containerStyle={styles.readOnly} />
      {user?.email ? <Input label="Email" value={user.email} editable={false} containerStyle={styles.readOnly} /> : null}
      <Text style={styles.hint}>Le téléphone et l'e-mail ne peuvent pas être modifiés depuis l'application.</Text>

      <Input label="Date de naissance" value={birth} onChangeText={setBirth} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignSelf: 'center', marginVertical: spacing.lg },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  readOnly: { opacity: 0.6 },
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.grey, marginTop: -spacing.sm, marginBottom: spacing.lg },
});
