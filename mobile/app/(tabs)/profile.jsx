import { useCallback, useEffect, useState } from "react";
import {
  View,
  Alert,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import ProfileHeader from "../../components/ProfileHeader";
import { useColors } from "../../hooks/useColors";
import LogoutButton from "../../components/LogoutButton";
import { Ionicons } from "@expo/vector-icons";
import { sleep } from ".";
import Loader from "../../components/Loader";

export default function Profile() {
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuthStore();
  const router = useRouter();
  const COLORS = useColors();

  const handleRefresh = async () => {
    setRefreshing(true);
    await sleep(500);
    // Add any profile-specific data fetching here if needed
    setRefreshing(false);
  };

  if (isLoading && !refreshing) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <ProfileHeader />
        
        <View style={{ paddingHorizontal: 16 }}>
          <View
            style={{
              backgroundColor: COLORS.cardBackground,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: COLORS.border,
              padding: 16,
              marginBottom: 14,
              shadowColor: COLORS.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 8 }}>
              Profile Details
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 4 }}>
              Username: <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>{user?.username || "N/A"}</Text>
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 8 }}>
              Email: <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>{user?.email || "N/A"}</Text>
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 12 }}>
              Role: <Text style={{ color: COLORS.textPrimary, fontWeight: "700", textTransform: 'capitalize' }}>{user?.role || "N/A"}</Text>
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 10,
                paddingVertical: 11,
                alignItems: "center",
                marginBottom: 10,
              }}
              onPress={() => router.push("/(tabs)/edit-profile")}
            >
              <Text style={{ color: COLORS.white, fontWeight: "700" }}>Edit Profile</Text>
            </TouchableOpacity>

            {user?.role === "tutor" && (
              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.white,
                  borderRadius: 10,
                  paddingVertical: 11,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
                onPress={() => router.push("/tutor/materials")}
              >
                <Ionicons name="library-outline" size={18} color={COLORS.primary} />
                <Text style={{ color: COLORS.primary, fontWeight: "700" }}>Manage Materials</Text>
              </TouchableOpacity>
            )}
          </View>

          <LogoutButton />
        </View>
      </ScrollView>
    </View>
  );
}
