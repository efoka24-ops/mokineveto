import React from 'react';
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

  return (
    <View style={styles.root}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} />}
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

        Réservé à l'éleveur : l'urgence est une demande émise vers un praticien,
        elle n'a pas de sens dans l'espace du praticien lui-même.
      */}
      {role === 'ELEVEUR' && <EmergencyButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
