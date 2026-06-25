import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radii, shadow, spacing } from '../../theme';
import { listVets, type Vet } from '../../services/vets';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PREVIEWS = [
  'Bonjour, comment va votre animal ?',
  'Pensez à isoler le sujet atteint.',
  'Je vous envoie l\'ordonnance.',
  'Le vaccin est disponible en pharmacie.',
  'Tenez-moi au courant de l\'évolution.',
];

export default function MessagesScreen() {
  const nav = useNavigation<Nav>();
  const [vets, setVets] = useState<Vet[]>([]);

  useEffect(() => {
    listVets().then(setVets);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Messages</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {vets.map((v, i) => (
          <Pressable
            key={v.id}
            style={styles.row}
            onPress={() => nav.navigate('Chat', { vetId: v.id, name: v.name })}
          >
            <Image source={{ uri: v.photo }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{v.name}</Text>
              <Text style={styles.preview} numberOfLines={1}>{PREVIEWS[i % PREVIEWS.length]}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.time}>09:{(10 + i).toString().padStart(2, '0')}</Text>
              {i % 2 === 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{i + 1}</Text></View> : null}
            </View>
          </Pressable>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgBlue },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.brown, textAlign: 'center', paddingVertical: spacing.lg },
  content: { paddingHorizontal: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  preview: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.grey },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.white },
});
