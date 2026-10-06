import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/ui/ToastHost';
import { useSession, useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { ServicesProvider } from '@/services';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const session = useSession();
  const profile = useViewerProfile();
  const { colors, dark } = useTheme();
  const signedIn = !!session.data;
  const user = profile.data?.user;
  const loading = session.isPending || (signedIn && profile.isPending);
  // Signed in but profile missing/failed to load: fall back to the signed-out flow.
  const ready = signedIn && !!user?.onboardingComplete;
  const onboarding = signedIn && !!user && !user.onboardingComplete;

  useEffect(() => {
    if (!session.isPending) void SplashScreen.hideAsync();
  }, [session.isPending]);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Protected guard={ready}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="preview" />
          <Stack.Screen name="pet/[id]" />
          <Stack.Screen name="user/[id]" />
          <Stack.Screen name="chat/[matchId]" />
          <Stack.Screen name="play-date/[matchId]" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="match-moment"
            options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="dev-menu" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarding}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!ready && !onboarding}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ServicesProvider>
            <RootNavigator />
          </ServicesProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
