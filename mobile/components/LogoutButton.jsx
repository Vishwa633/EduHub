import { Text, TouchableOpacity, Alert, Platform } from "react-native";
import { useAuthStore } from "../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../hooks/useColors";

export default function LogoutButton() {
  const { logout } = useAuthStore();
  const COLORS = useColors();

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to logout?")) {
        logout();
      }
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => logout(), style: "destructive" },
    ]);
  };

  return (
    <TouchableOpacity style={{ 
      backgroundColor: COLORS.primary, 
      borderRadius: 12, 
      padding: 12, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginBottom: 24, 
      marginHorizontal: 16,
      shadowColor: COLORS.black, 
      shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 4, 
      elevation: 2, 
    }} onPress={confirmLogout}>
      <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
      <Text style={{ color: COLORS.white, fontWeight: '600', marginLeft: 8 }}>Logout</Text>
    </TouchableOpacity>
  );
}