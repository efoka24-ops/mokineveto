import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, TopBar } from '../../components';
import { colors, fonts, radii, spacing } from '../../theme';
import {
  listNotifications,
  listAlerts,
  markNotificationRead,
  type ApiNotification,
  type ApiAlert,
} from '../../services/api';

const SEVERITY_COLOR: Record<ApiAlert['severity'], string> = {
  INFO: colors.green,
  WARNING: colors.star,
  CRITICAL: colors.danger,
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  appointment_confirmed: 'calendar',
  appointment_cancelled: 'close-circle',
  message: 'chatbubble-ellipses',
  reminder: 'alarm',
  EPIDEMIC: 'warning',
  REMINDER: 'alarm',
  SYSTEM: 'information-circle',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [notifRes, alertRes] = await Promise.all([listNotifications(), listAlerts()]);
        setNotifications(notifRes.data || []);
        setAlerts(alertRes.data || []);
        // Mark unread as read
        (notifRes.data || [])
          .filter((n) => !n.readAt)
          .forEach((n) => markNotificationRead(n.id).catch(() => {}));
      } catch (_err) {
        console.warn('[NotificationsScreen] Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Screen scroll bg={colors.white}>
      <TopBar title="Notifications" />

      {loading ? <Text style={styles.muted}>Chargement…</Text> : null}

      {/* Regional / national alerts */}
      {alerts.length > 0 ? (
        <View style={{ marginBottom: spacing.lg }}>
          <View style={styles.groupChip}>
            <Text style={styles.groupLabel}>Alertes</Text>
          </View>
          {alerts.map((a) => (
            <View key={a.id} style={[styles.item, styles.alertItem]}>
              <View style={[styles.iconCircle, { backgroundColor: SEVERITY_COLOR[a.severity] }]}>
                <Ionicons name={TYPE_ICON[a.type] || 'warning'} size={18} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{a.title}</Text>
                <Text style={styles.itemBody}>{a.body}</Text>
                {a.region ? <Text style={styles.region}>Région : {a.region}</Text> : null}
              </View>
              <Text style={styles.itemTime}>{timeAgo(a.createdAt)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Personal notifications */}
      {notifications.length > 0 ? (
        <View>
          <View style={styles.groupChip}>
            <Text style={styles.groupLabel}>Mes notifications</Text>
          </View>
          {notifications.map((n) => (
            <View key={n.id} style={[styles.item, !n.readAt && styles.itemUnread]}>
              <View style={styles.iconCircle}>
                <Ionicons name={TYPE_ICON[n.type] || 'notifications'} size={18} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{n.title}</Text>
                <Text style={styles.itemBody} numberOfLines={2}>{n.body}</Text>
              </View>
              <Text style={styles.itemTime}>{timeAgo(n.createdAt)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!loading && notifications.length === 0 && alerts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.greenPale} />
          <Text style={styles.muted}>Aucune notification pour l'instant.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontFamily: fonts.body, color: colors.grey, textAlign: 'center', marginTop: spacing.xl },
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.md },
  groupChip: { alignSelf: 'flex-start', backgroundColor: colors.greenPale, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 5, marginBottom: spacing.sm },
  groupLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.green },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  itemUnread: { backgroundColor: colors.greenPale + '66' },
  alertItem: { backgroundColor: colors.bgBlue, marginBottom: spacing.sm },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  itemBody: { fontFamily: fonts.body, fontSize: 12, color: colors.grey, marginTop: 2 },
  region: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.green, marginTop: 4 },
  itemTime: { fontFamily: fonts.body, fontSize: 11, color: colors.grey },
});
