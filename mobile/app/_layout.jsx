import { Stack, useRouter, useSegments } from "expo-router";
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
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hasInitializedRef = useRef(false);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initApp = async () => {
      await Promise.all([checkTheme(), checkAuth()]);
    };
    initApp();
  }, [checkTheme, checkAuth]);

  useEffect(() => {
    if (isCheckingAuth) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inThemeGroup = segments[0] === "(theme)";
    const inAdminGroup = segments[0] === "(admin)";
    const inTabsGroup = segments[0] === "(tabs)";

    if (!user && !inAuthGroup && !inThemeGroup) {
      // Redirect to login if not authenticated and not in auth/theme flow
      router.replace("/(auth)");
    } else if (user && (inAuthGroup || inThemeGroup)) {
      // Redirect to main app if authenticated but still in auth/theme flow
      if (user.role === "admin") {
        router.replace("/(admin)");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [user, segments, isCheckingAuth, router]);

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

