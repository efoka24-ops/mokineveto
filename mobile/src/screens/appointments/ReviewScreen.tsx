import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Button, Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import { getVet, reviewAppointment, type Vet } from '../../services/api';
import { useAppointmentsStore } from '../../store/useAppointmentsStore';
import type { RootStackParamList } from '../../navigation/types';

type Rt = RouteProp<RootStackParamList, 'Review'>;

export default function ReviewScreen() {
  const nav = useNavigation<any>();
  const { appointmentId, vetId } = useRoute<Rt>().params;
  const [vet, setVet] = useState<Vet | null>(null);
  const [stars, setStars] = useState(4);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const reloadAppointments = useAppointmentsStore((s) => s.load);

  useEffect(() => {
    getVet(vetId).then((response) => setVet(response?.data ?? null));
  }, [vetId]);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await reviewAppointment(appointmentId, stars, comment || undefined);
      await reloadAppointments();
      nav.goBack();
    } catch (_err) {
      console.warn('[ReviewScreen] Failed to submit review');
      nav.goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen footer={<Button title="Ajouter l'avis" loading={loading} onPress={onSubmit} />}>
      <TopBar title="Avis" tint={colors.blue} />
      <Text style={styles.intro}>Partagez votre expérience pour aider les autres éleveurs.</Text>

      <View style={styles.center}>
        {vet ? <Image source={{ uri: vet.photo }} style={styles.avatar} /> : null}
        <Text style={styles.name}>{vet?.name}</Text>
        <Text style={styles.specialty}>{vet?.specialty}</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setStars(n)}>
              <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={28} color={colors.blue} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.textareaWrap}>
        <TextInput
          placeholder="Écrivez votre commentaire ici…"
          placeholderTextColor={colors.grey}
          multiline
          value={comment}
          onChangeText={setComment}
          style={styles.textarea}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.body, fontSize: 13, color: colors.grey, marginBottom: spacing.lg },
  center: { alignItems: 'center', gap: spacing.xs },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: spacing.sm },
  name: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.blue },
  specialty: { fontFamily: fonts.body, fontSize: 13, color: colors.grey },
  stars: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg },
  textareaWrap: { backgroundColor: colors.bluePale, borderRadius: radii.md, padding: spacing.md },
  textarea: { minHeight: 120, fontFamily: fonts.body, fontSize: 14, color: colors.ink, textAlignVertical: 'top' },
});
