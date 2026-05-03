import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { formatMemberSince } from "../lib/utils";
import { useColors } from "../hooks/useColors";

function UserAvatar({ uri, size = 90, borderRadius, COLORS }) {
  const r = borderRadius ?? size / 2;
  const isReal = typeof uri === "string" && uri.trim().length > 0 && !uri.includes("dicebear.com");
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: r,
      overflow: "hidden",
      backgroundColor: COLORS.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 3,
      borderColor: COLORS.white,
    }}>
      {isReal
        ? <Image source={{ uri }} style={{ width: "100%", height: "100%", position: "absolute" }} contentFit="cover" />
        : <Ionicons name="person" size={size * 0.5} color={COLORS.textSecondary} />}
    </View>
  );
}

export default function ProfileHeader() {
  const { user } = useAuthStore();
  const COLORS = useColors();

  if (!user) return null;

  return (
    <View style={{
      backgroundColor: COLORS.white,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 20,
      marginBottom: 28,
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      alignItems: 'center',
    }}>
      <UserAvatar uri={user.profileImage} size={90} COLORS={COLORS} />

      <View style={{ alignItems: 'center', marginTop: 16, width: '100%' }}>
        <Text style={{
          fontSize: 24,
          fontWeight: '800',
          color: COLORS.textDark,
          marginBottom: 6,
          letterSpacing: 0.3,
        }}>
          {user.username}
        </Text>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10,
          gap: 8,
        }}>
          <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
          <Text style={{
            fontSize: 14,
            color: COLORS.textSecondary,
            fontWeight: '500',
          }}>
            {user.email}
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: COLORS.background,
          borderRadius: 12,
          marginBottom: 4,
        }}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
          <Text style={{
            fontSize: 13,
            color: COLORS.textSecondary,
            fontWeight: '500',
          }}>
            Joined {formatMemberSince(user.createdAt)}
          </Text>
        </View>

        {user?.role && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
            paddingVertical: 6,
            paddingHorizontal: 14,
            backgroundColor: `${COLORS.primary}15`,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${COLORS.primary}30`,
          }}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
            <Text style={{
              fontSize: 13,
              color: COLORS.primary,
              fontWeight: '600',
              textTransform: 'capitalize',
            }}>
              {user.role}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}