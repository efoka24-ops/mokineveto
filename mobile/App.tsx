import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, getStateFromPath, getPathFromState } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { useAppFonts } from './src/theme/useAppFonts';
import { colors } from './src/theme';
import './src/i18n';

// L'app web est servie sous /app/ (le domaine héberge la landing à la racine),
// donc les URL générées par React Navigation doivent rester préfixées, sinon
// un rechargement ou une navigation interne (ex. /login) tombe hors de la
// portée du manifest/service worker et Apache renvoie une 404.
const webLinking = Platform.OS === 'web'
  ? {
      prefixes: [],
      config: undefined as any,
      getStateFromPath: (path: string, options: any) =>
        getStateFromPath(path.replace(/^\/app\/?/, '/'), options),
      getPathFromState: (state: any, options: any) => {
        const path = getPathFromState(state, options);
        return path.startsWith('/app') ? path : `/app${path}`;
      },
    }
  : undefined;

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.white }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer linking={webLinking}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
