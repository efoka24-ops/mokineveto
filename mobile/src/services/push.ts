import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerPushToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Demande la permission, récupère le token Expo push et l'enregistre côté backend.
 * Échec silencieux : les notifications push restent un canal best-effort (l'e-mail
 * et l'historique in-app sont les canaux garantis).
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (tokenData.data) {
      await registerPushToken(tokenData.data);
    }
  } catch (_err) {
    console.warn('[push] Failed to register for push notifications');
  }
}
