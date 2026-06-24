import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Screen } from '../../components';
import { colors, fonts, spacing } from '../../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    title: 'Télémédecine vétérinaire',
    text: "Consultez un vétérinaire à distance par message, appel audio ou vidéo, où que vous soyez.",
  },
  {
    key: '2',
    title: 'Assistant de pré-analyse',
    text: "Décrivez les symptômes : notre assistant oriente et évalue l'urgence avant l'avis du vétérinaire.",
  },
  {
    key: '3',
    title: 'Market place',
    text: "Grâce à notre système de géolocalisation, découvrez les fournisseurs les plus proches de chez vous, avec leurs produits et horaires d'ouverture.",
  },
];

export default function OnboardingScreen() {
  const nav = useNavigation<any>();
  const ref = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = () => nav.navigate('Login');
  const onMomentum = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  const next = () => {
    if (index < SLIDES.length - 1) ref.current?.scrollToIndex({ index: index + 1 });
    else finish();
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.skip} onPress={finish}>
          Skip ›
        </Text>
      </View>
      <FlatList
        ref={ref}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentum}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.illu} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        <Button title={index === SLIDES.length - 1 ? 'Commencer' : 'Suivant'} onPress={next} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, alignItems: 'flex-end' },
  skip: { fontFamily: fonts.bodySemiBold, color: colors.brown, fontSize: 16 },
  slide: { width, paddingHorizontal: spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  illu: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: spacing.xl,
    backgroundColor: colors.bgLavender,
    marginBottom: spacing.xxxl,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.brown, marginBottom: spacing.md },
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.greyLight },
  dotActive: { width: 22, backgroundColor: colors.brown },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
});
