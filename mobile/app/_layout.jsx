import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import SafeScreen from "../components/SafeScreen";
import Loader from "../components/Loader";
import { StatusBar } from "expo-status-bar";

import { useThemeStore } from "../store/themeStore";
import { useAuthStore } from "../store/authStore";
import { useEffect, useRef } from "react";

export default function RootLayout() {
  const { checkTheme } = useThemeStore();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initApp = async () => {
      await Promise.all([checkTheme(), checkAuth()]);
    };
    initApp();
  }, [checkTheme, checkAuth]);

  if (isCheckingAuth) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SafeScreen>
            <Loader />
          </SafeScreen>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeScreen>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(theme)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SafeScreen>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
