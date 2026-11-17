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
  Prescription: { appointmentId: string };
  Carnet: undefined;
  SharedPreAnalyses: undefined;

  // Communication
  Chat: { conversationId?: string; vetId?: string; eleveurId?: string; name: string };
  Notifications: undefined;

  // Profil & paramètres
  EditProfile: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  Privacy: undefined;
  Help: undefined;

  // Urgence (SFD §4.2)
  Emergency: undefined;

  // Assistant IA / Fiches / Cheptel
  Chatbot: undefined;
  ChatbotHistory: undefined;
  FichesList: undefined;
  FicheDetail: { id: string };
  HerdList: undefined;
  AddAnimal: undefined;
  AnimalDetail: { id: string };

  // Marketplace
  ProductList: undefined;
  Cart: undefined;
  OrderHistory: undefined;
  SupplierProducts: undefined;
  SupplierOrders: undefined;
  SupplierProfile: undefined;

  // Multi-élevage / Sécurité
  FarmList: undefined;
  PinSetup: undefined;
  VetCredentials: undefined;
  VetAgenda: undefined;
  VetEpidemiology: undefined;
  AddFiche: undefined;
  PinUnlock: undefined;

  // Paiement
  PaymentMethods: undefined;
  AddCard: undefined;
  OrangeMoney: undefined;
  MtnMomo: undefined;
  PaymentRecap: {
    vetId: string;
    amount: number;
    consultationType: 'CALL' | 'VIDEO' | 'FIELD';
    farmId?: string;
    distanceKm?: number;
    method?: string;
    slot?: string;
    date?: string;
    time?: string;
    reason?: string;
  };
  PaymentResult: {
    success: boolean;
    vetName?: string;
    vetSpecialty?: string;
    date?: string;
    time?: string;
    appointmentId?: string;
    paymentId?: string;
    reference?: string;
    amount?: number;
    method?: 'ORANGE_MONEY' | 'MTN_MOMO' | 'CARD';
    phone?: string;
    consultationType?: 'CALL' | 'VIDEO' | 'FIELD';
    reason?: string;
  };
};
