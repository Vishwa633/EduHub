import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useAuthStore } from "../../../store/authStore";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_URL } from "../../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../../hooks/useColors";
import { useFavoritesStore } from "../../../store/favoritesStore";
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

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SubjectDetail() {
  const { token, user } = useAuthStore();
  const COLORS = useColors();
  const router = useRouter();
  const { name } = useLocalSearchParams();
  
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const favoriteTutorIds = useFavoritesStore((state) => state.favoriteTutorIds);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const favorites = useMemo(() => new Set(favoriteTutorIds), [favoriteTutorIds]);

  const decodedSubject = name ? decodeURIComponent(name) : "";
  // Remove trim() so filtering happens as soon as first letter is typed
  const normalizedQuery = String(searchQuery || "").toLowerCase();

  const normalizeSubject = (value) => String(value || "").trim();

  const fetchTutors = useCallback(
    async (pageNum = 1, refresh = false) => {
      try {
        if (!token) {
          setErrorMessage("Please login again to load tutors.");
          setLoading(false);
          setRefreshing(false);
          return;
        }

        if (refresh) setRefreshing(true);
        else if (pageNum === 1) setLoading(true);
        setErrorMessage("");

        const normalizedSubject = normalizeSubject(decodedSubject);
        const requestUrl = `${API_URL}/tutors/search/by-subject?subject=${encodeURIComponent(
          normalizedSubject
        )}&page=${pageNum}&limit=10`;

        console.log("🔍 Fetching tutors from:", requestUrl);

        const response = await fetch(requestUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to fetch tutors");

        const safeTutors = Array.isArray(data?.tutors) ? data.tutors : [];
        const safeTotalPages = Number.isFinite(data?.totalPages) ? data.totalPages : 1;

        console.log("✅ Fetched", safeTutors.length, "tutors");

        setTutors((prevTutors) => {
          if (refresh || pageNum === 1) {
            return safeTutors;
          }

          const mergedTutors = [...prevTutors, ...safeTutors];
          return Array.from(new Set(mergedTutors.map((tutor) => tutor._id))).map((id) =>
            mergedTutors.find((tutor) => tutor._id === id)
          );
        });
        setHasMore(pageNum < safeTotalPages);
        setPage(pageNum);
      } catch (error) {
        console.error("❌ Error fetching tutors:", error);
        setErrorMessage(error?.message || "Failed to load tutors");
      } finally {
        if (refresh) {
          await sleep(800);
          setRefreshing(false);
        } else setLoading(false);
      }
    },
    [token, decodedSubject]
  );

  const handleLoadMore = async () => {
    if (hasMore && !loading && !refreshing) {
      await fetchTutors(page + 1, false);
    }
  };

  const getExperienceBadge = (tutorProfile) => {
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
  };

  const filteredTutors = useMemo(() => {
    // Show all tutors only if searchQuery is empty string (not just whitespace)
    if (searchQuery === "") {
      return tutors;
    }

    return tutors.filter((item) => {
      const fullName = String(item?.tutorProfile?.fullName || "").toLowerCase();
      const username = String(item?.username || "").toLowerCase();
      const subject = String(item?.tutorProfile?.subject || "").toLowerCase();
      return fullName.includes(normalizedQuery) || username.includes(normalizedQuery) || subject.includes(normalizedQuery);
    });
  }, [tutors, normalizedQuery, searchQuery]);

  const renderItem = ({ item }) => (
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        padding: 16,
      }}
    >
      <TouchableOpacity
        onPress={() => toggleFavorite(item._id)}
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
        <Ionicons
          name={favorites.has(item._id) ? "heart" : "heart-outline"}
          size={18}
          color={favorites.has(item._id) ? "#ff4757" : COLORS.primary}
        />
      </TouchableOpacity>

      {/* TOP: Avatar Left + Details Right */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
        <View>
          <UserAvatar uri={item.profileImage} size={110} borderRadius={28} />
        </View>

        <View style={{ flex: 1, marginLeft: 12, minWidth: 0, paddingRight: 46 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary }}>
            Name: <Text style={{ fontSize: 15, fontWeight: "900", color: COLORS.primary }}>{item.tutorProfile?.fullName || item.username || "Not provided"}</Text>
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginTop: 4 }}>
            Subject: <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.primary }}>{item.tutorProfile?.subject || "General"}</Text>
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginTop: 4 }}>
            Contact: <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.primary }}>{item.tutorProfile?.mobileNumber || "Not provided"}</Text>
          </Text>
          {(() => {
            const badge = getExperienceBadge(item.tutorProfile);
            return (
              <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginTop: 4 }}>
                Experience: <Text style={{ fontSize: 14, fontWeight: "800", color: badge.text }}>{badge.label}</Text>
              </Text>
            );
          })()}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginRight: 6 }}>
              Rating:
            </Text>
            {[1, 2, 3, 4, 5].map((star) => {
              const rating = Number(item.ratingSummary?.average || 0);
              const roundedRating = Math.round(rating * 2) / 2;
              const isFullStar = roundedRating >= star;
              const isHalfStar = !isFullStar && roundedRating >= star - 0.5;

              return (
                <Ionicons
                  key={`star-${star}`}
                  name={isFullStar ? "star" : isHalfStar ? "star-half" : "star-outline"}
                  size={14}
                  color={isFullStar || isHalfStar ? COLORS.primary : COLORS.border}
                  style={{ marginRight: 1 }}
                />
              );
            })}
          </View>
        </View>
      </View>

      {/* BUTTON */}
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/(tabs)/tutor/[id]",
            params: {
              id: String(item._id || ""),
              returnTo: `/(tabs)/subject/${encodeURIComponent(decodedSubject)}`,
            },
          })
        }
        style={{
          backgroundColor: COLORS.primary,
          paddingVertical: 12,
          borderRadius: 12,
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

  useEffect(() => {
    setTutors([]);
    setPage(1);
    setHasMore(true);
    setSearchQuery("");
    fetchTutors(1, false);
  }, [decodedSubject, fetchTutors]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          backgroundColor: COLORS.white,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.inputBackground,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: COLORS.textPrimary }}>
              {decodedSubject}
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
              {filteredTutors.length} tutor{filteredTutors.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.inputBackground,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 10,
            paddingVertical: 2,
          }}
        >
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tutor by name or subject"
            placeholderTextColor={COLORS.textSecondary}
            underlineColorAndroid="transparent"
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
            style={{
              flex: 1,
              height: 40,
              marginLeft: 8,
              color: COLORS.textPrimary,
              fontSize: 14,
              textDecorationLine: "none",
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tutors List */}
      {loading && page === 1 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredTutors}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTutors(1, true)}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={normalizedQuery ? undefined : handleLoadMore}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 36, paddingHorizontal: 20 }}>
                <Ionicons name="people-outline" size={56} color={COLORS.textSecondary} />
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    marginTop: 16,
                    fontSize: 16,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {normalizedQuery ? "No tutors match your search" : `No tutors found for ${decodedSubject}`}
                </Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 8, textAlign: "center" }}>
                  {normalizedQuery ? "Try a different keyword." : "Please try another subject."}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {errorMessage ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            backgroundColor: "#fff1f3",
            borderColor: "#f5c2c7",
            borderWidth: 1,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ color: "#b42318", fontWeight: "600" }}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}
