import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';

interface Notif {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
}

const GROUPS: { label: string; items: Notif[] }[] = [
  {
    label: "Aujourd'hui",
    items: [
      { icon: 'calendar', title: 'Rendez-vous programmé', body: 'Votre consultation avec Dr. NGANE est confirmée.', time: '2 min', unread: true },
      { icon: 'sync', title: 'Changement d\'horaire', body: 'Le créneau de demain a été déplacé à 11:00.', time: '2 h', unread: true },
      { icon: 'document-text', title: 'Note médicale', body: 'Une ordonnance a été ajoutée au dossier de votre animal.', time: '3 h' },
    ],
  },
  {
    label: 'Hier',
    items: [
      { icon: 'calendar', title: 'Rappel de vaccination', body: 'Vaccination du troupeau prévue cette semaine.', time: '1 j' },
    ],
  },
  {
    label: '15 avril',
    items: [
      { icon: 'chatbubble-ellipses', title: 'Mise à jour du dossier', body: 'Le carnet de santé a été mis à jour.', time: '5 j' },
    ],
  },
];

export default function NotificationsScreen() {
  return (
    <Screen scroll bg={colors.white}>
      <TopBar
        title="Notification"
        right={
          <View style={styles.news}>
            <Text style={styles.newsText}>News</Text>
            <View style={styles.dot} />
          </View>
        }
      />
      {GROUPS.map((g) => (
        <View key={g.label} style={{ marginBottom: spacing.md }}>
          <View style={styles.groupChip}>
            <Text style={styles.groupLabel}>{g.label}</Text>
          </View>
          {g.items.map((n, i) => (
            <View key={i} style={[styles.item, n.unread && styles.itemUnread]}>
              <View style={styles.iconCircle}>
                <Ionicons name={n.icon} size={18} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{n.title}</Text>
                <Text style={styles.itemBody} numberOfLines={2}>{n.body}</Text>
              </View>
              <Text style={styles.itemTime}>{n.time}</Text>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  news: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.greenPale, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  newsText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.brown },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  groupChip: { alignSelf: 'flex-start', backgroundColor: colors.greenPale, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 5, marginBottom: spacing.sm },
  groupLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.green },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  itemUnread: { backgroundColor: colors.greenPale + '66' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  itemBody: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
  itemTime: { fontFamily: fonts.body, fontSize: 11, color: colors.grey },
});
