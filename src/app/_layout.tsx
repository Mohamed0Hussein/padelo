import { Roboto_400Regular, Roboto_500Medium } from '@expo-google-fonts/roboto';
import { RobotoMono_400Regular, RobotoMono_600SemiBold } from '@expo-google-fonts/roboto-mono';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useApp } from '@/store';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

function Shell() {
  const { dark } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const onboarded = useApp((s) => s.settings.onboarded);
  useEffect(() => {
    if (!onboarded && segments[0] !== 'welcome') router.replace('/welcome');
  }, [onboarded, segments, router]);
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="courtside/[id]" options={{ orientation: 'landscape', animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function Root() {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    RobotoMono_400Regular,
    RobotoMono_600SemiBold,
    ...MaterialIcons.font,
  });
  const ready = useApp((s) => s.ready);
  const hydrate = useApp((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync();
  }, [fontsLoaded, ready]);
  if (!fontsLoaded || !ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
