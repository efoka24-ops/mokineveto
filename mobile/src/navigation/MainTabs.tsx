import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { TabParamList } from './types';
import TabBar from './TabBar';
import HomeScreen from '../screens/home/HomeScreen';
import MessagesScreen from '../screens/chat/MessagesScreen';
import AgendaScreen from '../screens/appointments/AgendaScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
    </Tab.Navigator>
  );
}
