import { Text, TouchableOpacity, Alert, Platform } from "react-native";
import { useAuthStore } from "../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../hooks/useColors";
import { useRouter } from "expo-router";

export default function LogoutButton() {
  const { logout } = useAuthStore();
  const COLORS = useColors();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/(auth)");
    } catch (error) {
      Alert.alert("Error", "Unable to logout at this time");
    }
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to logout?")) {
        logout();
      }
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: handleLogout, style: "destructive" },
    ]);
  };

  return (
    <TouchableOpacity
      style={{
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
      }}
      activeOpacity={0.85}
      onPress={confirmLogout}
    >
      <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
      <Text
        style={{
          color: COLORS.white,
          fontWeight: '700',
          fontSize: 16,
          letterSpacing: 0.3,
        }}
      >
        Logout
      </Text>
    </TouchableOpacity>
  );
}