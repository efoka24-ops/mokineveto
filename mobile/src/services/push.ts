import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { registerPushToken } from './api';

/**
 * Expo Go ne fournit plus les notifications push distantes sur Android depuis le
 * SDK 53 : le simple fait de charger `expo-notifications` y lève une exception.
 * On détecte donc l'environnement avant tout accès au module, et on charge
 * celui-ci paresseusement — un import statique planterait au démarrage, avant
 * même le premier rendu.
 *
 * Les notifications restent un canal best-effort : leur indisponibilité ne doit
 * jamais empêcher l'application de fonctionner.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

/** Charge `expo-notifications` à la demande, ou renvoie null si indisponible. */
function loadNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  if (notificationsModule) return notificationsModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch (_err) {
    console.warn('[push] expo-notifications indisponible dans cet environnement');
    return null;
  }

  if (!handlerConfigured) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  }

  return notificationsModule;
}

/**
 * Demande la permission, récupère le token Expo push et l'enregistre côté backend.
 * Échec silencieux : les notifications push restent un canal best-effort (l'e-mail
 * et l'historique in-app sont les canaux garantis).
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const Notifications = loadNotifications();
    if (!Notifications) return;

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

/** Indique si les notifications push sont exploitables dans l'environnement courant. */
export function arePushNotificationsAvailable(): boolean {
  return !isExpoGo;
}
