import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { TabParamList } from './types';
import TabBar from './TabBar';
import EmergencyButton from '../components/EmergencyButton';
import { useAuthStore } from '../store/useAuthStore';
import HomeScreen from '../screens/home/HomeScreen';
import MessagesScreen from '../screens/chat/MessagesScreen';
import AgendaScreen from '../screens/appointments/AgendaScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function MainTabs() {
  const role = useAuthStore((s) => s.user?.role);
  const [tab, setTab] = useState<keyof TabParamList>('Home');

  return (
    <View style={styles.root}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} />}
        screenListeners={{
          state: (e) => {
            const nav = e.data as { state?: { index: number; routeNames: string[] } };
            const s = nav.state;
            if (s) setTab(s.routeNames[s.index] as keyof TabParamList);
          },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Messages" component={MessagesScreen} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} />
        <Tab.Screen name="Agenda" component={AgendaScreen} />
      </Tab.Navigator>

      {/*
        Bouton d'urgence permanent (SFD §4.2) : monté au-dessus de la navigation
        à onglets pour rester atteignable depuis n'importe quel onglet sans
        navigation préalable.

        Masqué sur l'accueil, où l'urgence est déjà présente sous la forme d'une
        grande tuile rouge : l'exigence de permanence y est donc satisfaite, et
        le bouton flottant ne ferait que recouvrir le résumé du cheptel.

        Réservé à l'éleveur : l'urgence est une demande émise vers un praticien,
        elle n'a pas de sens dans l'espace du praticien lui-même.
      */}
      {role === 'ELEVEUR' && tab !== 'Home' && <EmergencyButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
