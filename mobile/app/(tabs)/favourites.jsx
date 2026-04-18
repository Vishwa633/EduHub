import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { useColors } from "../../hooks/useColors";
import { Image } from "expo-image";

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

const buildHalfStarName = (rating, star) => {
  const rounded = Math.round(Number(rating || 0) * 2) / 2;
  const isFull = rounded >= star;
  const isHalf = !isFull && rounded >= star - 0.5;
  if (isFull) return "star";
  if (isHalf) return "star-half";
  return "star-outline";
};

export default function FavouritesPage() {
  const router = useRouter();
  const COLORS = useColors();
  const token = useAuthStore((state) => state.token);
  const favoriteTutorIds = useFavoritesStore((state) => state.favoriteTutorIds);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getExperienceBadge = useCallback((tutorProfile) => {
    if (!tutorProfile) {
      return { label: "Not specified", bg: COLORS.inputBackground, text: COLORS.textSecondary };
    }

    const level = String(tutorProfile.experienceLevel || "").toLowerCase();

    if (level === "beginner" || level.includes("0-2") || level.includes("beginner")) {
      return { label: "🟢 Beginner", bg: "#e7f8ef", text: "#0f7a43" };
    }
    if (level === "intermediate" || level.includes("3-5") || level.includes("intermediate")) {
      return { label: "🟡 Intermediate", bg: "#fff8dd", text: "#7a5a00" };
    }
    if (level === "expert" || level.includes("6+") || level.includes("expert")) {
      return { label: "🔵 Expert", bg: "#e8f1ff", text: "#1b4fa0" };
    }

    const rawYears = tutorProfile.yearsOfExperience;
    const years =
      typeof rawYears === "number"
        ? rawYears
        : Number.parseInt(String(rawYears || "").match(/\d+/)?.[0] || "", 10);

    if (!Number.isNaN(years)) {
      if (years <= 2) return { label: "🟢 Beginner", bg: "#e7f8ef", text: "#0f7a43" };
      if (years <= 5) return { label: "🟡 Intermediate", bg: "#fff8dd", text: "#7a5a00" };
      return { label: "🔵 Expert", bg: "#e8f1ff", text: "#1b4fa0" };
    }

    return { label: "Not specified", bg: COLORS.inputBackground, text: COLORS.textSecondary };
  }, [COLORS]);

  const loadFavourites = useCallback(async (isRefresh = false) => {
    try {
      if (!token) {
        setTutors([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const ids = Array.from(new Set((favoriteTutorIds || []).map((id) => String(id || "").trim()).filter(Boolean)));
      if (!ids.length) {
        setTutors([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const responses = await Promise.allSettled(
        ids.map((id) =>
          fetch(`${API_URL}/tutors/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      );

      const items = [];
      for (const result of responses) {
        if (result.status !== "fulfilled") continue;
        const response = result.value;
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || !payload._id) continue;
        items.push(payload);
      }

      setTutors(items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [favoriteTutorIds, token]);

  useFocusEffect(
    useCallback(() => {
      loadFavourites(false);
    }, [loadFavourites]),
  );

  const totalCount = useMemo(() => tutors.length, [tutors.length]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          backgroundColor: COLORS.cardBackground,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: COLORS.inputBackground,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View>
          <Text style={{ color: COLORS.textPrimary, fontWeight: "900", fontSize: 21 }}>Favourites</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>
            {totalCount} tutor{totalCount === 1 ? "" : "s"} saved
          </Text>
        </View>
      </View>

      <FlatList
        data={tutors}
        keyExtractor={(item) => String(item?._id || item?.id)}
        contentContainerStyle={{ paddingVertical: 14, paddingHorizontal: 14, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFavourites(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 56 }}>
            <Ionicons name="heart-outline" size={48} color={COLORS.textSecondary} />
            <Text style={{ marginTop: 14, color: COLORS.textPrimary, fontWeight: "800", fontSize: 17 }}>No favourites yet</Text>
            <Text style={{ marginTop: 6, color: COLORS.textSecondary, textAlign: "center" }}>
              Add tutors to favourites from tutor cards.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const rating = Number(item?.ratingSummary?.average || 0);
          const roundedRating = Math.round(rating * 2) / 2;
          const badge = getExperienceBadge(item?.tutorProfile);

          return (
            <View
              style={{
                backgroundColor: COLORS.white,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 16,
                marginBottom: 12,
                padding: 14,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <TouchableOpacity
                onPress={() => toggleFavorite(item?._id)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  zIndex: 2,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: COLORS.white,
                  borderWidth: 2,
                  borderColor: COLORS.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="heart" size={18} color="#ff4757" />
              </TouchableOpacity>

              <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
                <View>
                  <UserAvatar uri={item?.profileImage} size={110} borderRadius={28} />
                </View>

                <View style={{ flex: 1, marginLeft: 12, minWidth: 0, paddingRight: 46 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary }}>
                    Name: <Text style={{ fontSize: 15, fontWeight: "900", color: COLORS.primary }}>{item?.tutorProfile?.fullName || item?.username || "Not provided"}</Text>
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginTop: 4 }}>
                    Subject: <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.primary }}>{item?.tutorProfile?.subject || "General"}</Text>
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginTop: 4 }}>
                    Contact: <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.primary }}>{item?.tutorProfile?.mobileNumber || "Not provided"}</Text>
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginTop: 4 }}>
                    Experience: <Text style={{ fontSize: 14, fontWeight: "800", color: badge.text }}>{badge.label}</Text>
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginRight: 6 }}>
                      Rating:
                    </Text>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const iconName = buildHalfStarName(roundedRating, star);
                      const isFilled = iconName === "star" || iconName === "star-half";
                      return (
                        <Ionicons
                          key={`${item?._id || "tutor"}-star-${star}`}
                          name={iconName}
                          size={14}
                          color={isFilled ? COLORS.primary : COLORS.border}
                          style={{ marginRight: 1 }}
                        />
                      );
                    })}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/tutor/[id]",
                    params: {
                      id: String(item?._id || ""),
                      returnTo: "/(tabs)/favourites",
                    },
                  })
                }
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: COLORS.primary,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="open" size={16} color={COLORS.white} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.white }}>View Details</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}
