import { useCallback, useEffect, useState } from "react";
import {
  View,
  Alert,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
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

  const ProfileInfoCard = ({ icon, iconColor, label, value }) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: COLORS.white,
        marginBottom: 10,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: `${iconColor}15`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 12,
            color: COLORS.textSecondary,
            fontWeight: '500',
            marginBottom: 2,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: COLORS.textPrimary,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );

  const PrimaryButton = ({ label, icon, onPress }) => (
    <TouchableOpacity
      style={{
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 12,
        gap: 10,
      }}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {icon && <Ionicons name={icon} size={20} color={COLORS.white} />}
      <Text
        style={{
          color: COLORS.white,
          fontWeight: '700',
          fontSize: 16,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const SecondaryButton = ({ label, icon, onPress }) => (
    <TouchableOpacity
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
        marginBottom: 12,
      }}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {icon && <Ionicons name={icon} size={20} color={COLORS.primary} />}
      <Text
        style={{
          color: COLORS.primary,
          fontWeight: '700',
          fontSize: 16,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        scrollEventThrottle={16}
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
          {/* Profile Details Section */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '800',
                color: COLORS.textDark,
                marginBottom: 14,
                marginLeft: 2,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Account Details
            </Text>

            <ProfileInfoCard
              icon="person-outline"
              iconColor={COLORS.primary}
              label="Username"
              value={user?.username || "N/A"}
            />

            <ProfileInfoCard
              icon="mail-outline"
              iconColor={COLORS.primary}
              label="Email Address"
              value={user?.email || "N/A"}
            />

            {user?.role && (
              <ProfileInfoCard
                icon="shield-checkmark"
                iconColor={COLORS.primary}
                label="Account Type"
                value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              />
            )}
          </View>

          {/* Action Buttons Section */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '800',
                color: COLORS.textDark,
                marginBottom: 14,
                marginLeft: 2,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Actions
            </Text>

            <PrimaryButton
              label="Edit Profile"
              icon="create-outline"
              onPress={() => router.push("/(tabs)/edit-profile")}
            />

            {user?.role === "tutor" && (
              <SecondaryButton
                label="Manage Materials"
                icon="library-outline"
                onPress={() => router.push("/tutor/materials")}
              />
            )}
          </View>

          {/* Logout Section */}
          <View style={{ marginTop: 8 }}>
            <LogoutButton />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
