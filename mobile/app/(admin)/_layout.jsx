import { Ionicons } from "@expo/vector-icons";
import { Tabs, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";

export default function AdminLayout() {
  const COLORS = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Number.isFinite(insets?.bottom) ? insets.bottom : 0;
  const user = useAuthStore((state) => state.user);
  const role = String(user?.role || "");

  if (!role) {
    return <Redirect href="/(auth)" />;
  }

  if (role && role !== "admin") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#6b7280",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: 2,
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarHideOnKeyboard: false,
        tabBarStyle: {
          display: "flex",
          elevation: 24,
          backgroundColor: COLORS.cardBackground,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          paddingTop: 5,
          paddingBottom: Math.max(bottomInset, 8),
          minHeight: 64,
          height: 72 + bottomInset,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Admin",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="sessions"
        options={{
          title: "Sessions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tutor-details"
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="pending-tutors"
        options={{
          title: "Pending",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin-disputes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="subject-management"
        options={{
          title: "Subjects",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-inquiries"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="tutor/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
