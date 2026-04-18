import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { formatMemberSince } from "../lib/utils";
import { useColors } from "../hooks/useColors";

function UserAvatar({ uri, size = 80, borderRadius }) {
  const r = borderRadius ?? size / 2;
  const isReal = typeof uri === "string" && uri.trim().length > 0 && !uri.includes("dicebear.com");
  return (
    <View style={{ width: size, height: size, borderRadius: r, overflow: "hidden",
      backgroundColor: "#b0b3b8", alignItems: "center", justifyContent: "center" }}>
      {isReal
        ? <Image source={{ uri }} style={{ width: "100%", height: "100%", position: "absolute" }} contentFit="cover" />
        : <Ionicons name="person" size={size * 0.6} color="#ffffff" />}
    </View>
  );
}

export default function ProfileHeader() {
  const { user } = useAuthStore();
  const COLORS = useColors();

  if (!user) return null;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      marginHorizontal: 16,
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: COLORS.border,
    }}>
      <View style={{ marginRight: 16 }}>
        <UserAvatar uri={user.profileImage} size={80} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 }}>{user.username}</Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 }}>{user.email}</Text>
        <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>🗓️ Joined {formatMemberSince(user.createdAt)}</Text>
      </View>
    </View>
  );
}