import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Messages: undefined;
  Agenda: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  // Auth
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  ResetPassword: undefined;
  ChangePassword: undefined;
  Onboarding: undefined;

  // App shell
  Main: NavigatorScreenParams<TabParamList> | undefined;

  // Vétérinaires / annuaire
  VetList: { title?: string } | undefined;
  VetDetail: { id: string };
  Favorites: undefined;
  GenderList: { gender: 'femme' | 'homme' };
  TopRated: undefined;

  // Rendez-vous
  Schedule: { vetId: string };
  AppointmentList: undefined;
  AppointmentDetail: { id: string };
  CancelAppointment: { id: string };
  Review: { appointmentId: string; vetId: string };

  // Communication
  Chat: { vetId: string; name: string };
  Notifications: undefined;

  // Profil & paramètres
  EditProfile: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  Privacy: undefined;
  Help: undefined;

  // Assistant IA / Fiches / Cheptel
  Chatbot: undefined;
  FichesList: undefined;
  FicheDetail: { id: string };
  HerdList: undefined;
  AddAnimal: undefined;
  AnimalDetail: { id: string };

  // Paiement
  PaymentMethods: undefined;
  AddCard: undefined;
  OrangeMoney: undefined;
  MtnMomo: undefined;
  PaymentRecap: { vetId: string; amount: number; method?: string; slot?: string; date?: string; time?: string; reason?: string };
  PaymentResult: { success: boolean; vetName?: string; date?: string; time?: string };
};
