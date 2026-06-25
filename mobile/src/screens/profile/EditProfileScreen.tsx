import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Screen, TopBar } from '../../components';
import { colors, spacing } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function EditProfileScreen() {
  const nav = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [birth, setBirth] = useState(user?.birthDate ?? '');

  return (
    <Screen bg={colors.white} scroll footer={<Button title="Mettre à jour" onPress={() => nav.goBack()} />}>
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
      <Input label="Téléphone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Input label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Input label="Date de naissance" value={birth} onChangeText={setBirth} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignSelf: 'center', marginVertical: spacing.lg },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
});
