import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuthStore } from '../store/useAuthStore';
import { useSecurityStore } from '../store/useSecurityStore';
import PinUnlockScreen from '../screens/security/PinUnlockScreen';

import MainTabs from './MainTabs';

// Auth
import SplashScreen from '../screens/auth/SplashScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Vétérinaires
import VetListScreen from '../screens/vets/VetListScreen';
import VetDetailScreen from '../screens/vets/VetDetailScreen';
import FavoritesScreen from '../screens/vets/FavoritesScreen';
import GenderListScreen from '../screens/vets/GenderListScreen';
import TopRatedScreen from '../screens/vets/TopRatedScreen';

// Rendez-vous
import ScheduleScreen from '../screens/appointments/ScheduleScreen';
import AppointmentDetailScreen from '../screens/appointments/AppointmentDetailScreen';
import CancelAppointmentScreen from '../screens/appointments/CancelAppointmentScreen';
import ReviewScreen from '../screens/appointments/ReviewScreen';

// Communication
import ChatScreen from '../screens/chat/ChatScreen';
import NotificationsScreen from '../screens/chat/NotificationsScreen';

// Profil
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import NotificationSettingsScreen from '../screens/profile/NotificationSettingsScreen';
import PrivacyScreen from '../screens/profile/PrivacyScreen';
import HelpScreen from '../screens/profile/HelpScreen';

// Assistant IA / Fiches / Cheptel
import ChatbotScreen from '../screens/assistant/ChatbotScreen';
import FichesListScreen from '../screens/fiches/FichesListScreen';
import FicheDetailScreen from '../screens/fiches/FicheDetailScreen';
import HerdListScreen from '../screens/herd/HerdListScreen';
import AddAnimalScreen from '../screens/herd/AddAnimalScreen';
import AnimalDetailScreen from '../screens/herd/AnimalDetailScreen';
import FarmListScreen from '../screens/herd/FarmListScreen';

// Marketplace
import ProductListScreen from '../screens/marketplace/ProductListScreen';
import CartScreen from '../screens/marketplace/CartScreen';
import OrderHistoryScreen from '../screens/marketplace/OrderHistoryScreen';

// Sécurité
import PinSetupScreen from '../screens/security/PinSetupScreen';

// Paiement
import PaymentMethodsScreen from '../screens/payment/PaymentMethodsScreen';
import AddCardScreen from '../screens/payment/AddCardScreen';
import OrangeMoneyScreen from '../screens/payment/OrangeMoneyScreen';
import MtnMomoScreen from '../screens/payment/MtnMomoScreen';
import PaymentRecapScreen from '../screens/payment/PaymentRecapScreen';
import PaymentResultScreen from '../screens/payment/PaymentResultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, hydrated, hydrate } = useAuthStore();
  const { hasPin, hydrate: hydrateSecurity } = useSecurityStore();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    hydrate();
    hydrateSecurity();
  }, [hydrate, hydrateSecurity]);

  if (!hydrated) {
    return <SplashScreen />;
  }

  // PIN gate : si un PIN est configuré et qu'un utilisateur est connecté, exiger le déverrouillage.
  if (user && hasPin && !unlocked) {
    return <PinUnlockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Group>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="VetList" component={VetListScreen} />
          <Stack.Screen name="VetDetail" component={VetDetailScreen} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="GenderList" component={GenderListScreen} />
          <Stack.Screen name="TopRated" component={TopRatedScreen} />
          <Stack.Screen name="Schedule" component={ScheduleScreen} />
          <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
          <Stack.Screen name="CancelAppointment" component={CancelAppointmentScreen} />
          <Stack.Screen name="Review" component={ReviewScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
          <Stack.Screen name="AddCard" component={AddCardScreen} />
          <Stack.Screen name="OrangeMoney" component={OrangeMoneyScreen} />
          <Stack.Screen name="MtnMomo" component={MtnMomoScreen} />
          <Stack.Screen name="PaymentRecap" component={PaymentRecapScreen} />
          <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Chatbot" component={ChatbotScreen} />
          <Stack.Screen name="FichesList" component={FichesListScreen} />
          <Stack.Screen name="FicheDetail" component={FicheDetailScreen} />
          <Stack.Screen name="HerdList" component={HerdListScreen} />
          <Stack.Screen name="AddAnimal" component={AddAnimalScreen} />
          <Stack.Screen name="AnimalDetail" component={AnimalDetailScreen} />
          <Stack.Screen name="FarmList" component={FarmListScreen} />
          <Stack.Screen name="ProductList" component={ProductListScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
          <Stack.Screen name="PinSetup" component={PinSetupScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
