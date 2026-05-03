import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuthStore } from "../../../store/authStore";
import { API_URL } from "../../../constants/api";
import { useColors } from "../../../hooks/useColors";
import StarRating from "../../../components/StarRating";

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

const EMPTY_BREAKDOWN = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

export default function TutorDetailsPage() {
    // --- Rating submit handler ---
    const handleSubmitRating = async () => {
      const selectedRating = Number(studentRating || 0);
      if (!selectedRating) {
        setErrorMessage("Please select a rating before submitting.");
        return;
      }

      try {
        setIsSavingRating(true);
        setErrorMessage("");

        const response = await fetch(`${API_URL}/tutors/${id}/rate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rating: selectedRating }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to save rating");
        }

        setRatingSummary({
          average: Number(data?.ratingSummary?.average || 0),
          count: Number(data?.ratingSummary?.count || 0),
          breakdown: normalizeBreakdown(data?.ratingSummary?.breakdown),
        });

        // Optionally, refresh tutor details
        // await fetchTutorDetails();
      } catch (error) {
        setErrorMessage(error.message || "Failed to save rating");
      } finally {
        setIsSavingRating(false);
      }
    };
  // --- All useState hooks at the top ---
  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [studentRating, setStudentRating] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ average: 0, count: 0, breakdown: EMPTY_BREAKDOWN });
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  // --- Back button handler ---
  const handleBackPress = () => {
    const normalizedReturnTo = String(returnTo || "").trim();
    if (normalizedReturnTo.startsWith("/")) {
      router.replace(normalizedReturnTo);
      return;
    }

    if (router.canGoBack()) {
      router.back();
        return;
      }

      router.replace("/(tabs)");
    };
  const { id, tutorData, returnTo } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const COLORS = useColors();
  const normalizedReturnTo = String(returnTo || "").trim();

  const handleSubmitFeedback = async () => {
    if (!feedbackComment.trim()) return;
    try {
      setIsSavingFeedback(true);
      setErrorMessage("");
      const response = await fetch(`${API_URL}/tutors/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: feedbackComment.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to submit feedback");
      setFeedbackComment("");
      await fetchTutorDetails();
    } catch (error) {
      setErrorMessage(error.message || "Failed to submit feedback");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const getExperienceLabel = (profile) => {
    if (!profile) return "Not specified";
    const level = String(profile.experienceLevel || "").toLowerCase();
    if (level === "beginner" || level.includes("beginner") || level.includes("0-2")) return "🟢 Beginner";
    if (level === "intermediate" || level.includes("intermediate") || level.includes("3-5")) return "🟡 Intermediate";
    if (level === "expert" || level.includes("expert") || level.includes("6+")) return "🔵 Expert";

    const yearsRaw = profile.yearsOfExperience;
    const years =
      typeof yearsRaw === "number"
        ? yearsRaw
        : Number.parseInt(String(yearsRaw || "").match(/\d+/)?.[0] || "", 10);

    if (!Number.isNaN(years)) {
      if (years <= 2) return "🟢 Beginner";
      if (years <= 5) return "🟡 Intermediate";
      return "🔵 Expert";
    }

    return "Not specified";
  };

  const getPriceTypeLabel = (priceType) => {
    if (priceType === "per_session") return "Per Session";
    return "Not specified";
  };

  const getPriceLabel = (profile) => {
    const value = Number(profile?.price);
    if (Number.isNaN(value) || value <= 0) return "Not specified";
    return `LKR ${value.toLocaleString()}`;
  };

  const getAgeLabel = (profile, tutorObj) => {
    const rawAge = profile?.age ?? tutorObj?.age;
    const ageValue = Number(rawAge);
    if (Number.isNaN(ageValue) || ageValue <= 0) return "N/A";
    return String(ageValue);
  };

  const formatAvailabilityLabel = (slot) => {
    if (typeof slot === "string") return slot;
    if (!slot || typeof slot !== "object") return "Not specified";

    const day = slot.day || "Day";
    const from = slot.from || "--:--";
    const to = slot.to || "--:--";
    return `${day}: ${from} - ${to}`;
  };

  const availabilitySlots = Array.isArray(tutor?.tutorProfile?.availability)
    ? tutor.tutorProfile.availability
    : ["Mon - Fri", "9:00 AM - 5:00 PM", "Weekend on request", "Online & In-person"];

  const averageRating = Number(ratingSummary?.average || 0);
  const reviewCount = Number(ratingSummary?.count || 0);

  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count = Number(ratingSummary?.breakdown?.[stars] || 0);
    const percent = reviewCount ? Math.round((count / reviewCount) * 100) : 0;
    return { stars, count, percent };
  });

  const normalizeBreakdown = (rawBreakdown) => ({
    1: Number(rawBreakdown?.[1] ?? rawBreakdown?.["1"] ?? 0),
    2: Number(rawBreakdown?.[2] ?? rawBreakdown?.["2"] ?? 0),
    3: Number(rawBreakdown?.[3] ?? rawBreakdown?.["3"] ?? 0),
    4: Number(rawBreakdown?.[4] ?? rawBreakdown?.["4"] ?? 0),
    5: Number(rawBreakdown?.[5] ?? rawBreakdown?.["5"] ?? 0),
  });



  // Move fetchTutorDetails outside useEffect so it can be called elsewhere
  const fetchTutorDetails = async () => {
    if (!id || id === "undefined") return;
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetch(`${API_URL}/tutors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data || data.error) {
        throw new Error(data.message || "Failed to fetch tutor details");
      }
      setTutor(data);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setRatingSummary({
        average: Number(data?.ratingSummary?.average || 0),
        count: Number(data?.ratingSummary?.count || 0),
        breakdown: normalizeBreakdown(data?.ratingSummary?.breakdown),
      });
      setStudentRating(Number(data?.myRating || 0));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load tutor details");
      setTutor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutorDetails();
  }, [id, token]);

    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, padding: 20 }}>
          <Text style={{ color: "#b42318", fontSize: 16, fontWeight: "700", textAlign: "center" }}>{errorMessage}</Text>
        </View>
      );
    }

    if (!tutor) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, padding: 20 }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "center" }}>Tutor details not available</Text>
        </View>
      );
    }

  const renderSectionCard = (children, extraStyle = {}) => (
    <View
      style={{
        backgroundColor: COLORS.cardBackground,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        ...extraStyle,
      }}
    >
      {children}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        onPress={handleBackPress}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.cardBackground,
          borderWidth: 1,
          borderColor: COLORS.border,
          marginBottom: 12,
        }}
      >
        <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
      </TouchableOpacity>

      {renderSectionCard(
        <>
          {!!errorMessage && (
            <Text style={{ color: "#b42318", marginBottom: 10, fontSize: 13, textAlign: "center" }}>
              {errorMessage}
            </Text>
          )}

          <View style={{ alignItems: "center", marginBottom: 18 }}>
            <View
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 3,
                borderColor: COLORS.primary,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 4,
                backgroundColor: COLORS.cardBackground,
                overflow: "hidden",
              }}
            >
              <UserAvatar uri={tutor.profileImage} size={140} borderRadius={70} />
            </View>
          </View>

          <Text
            style={{
              fontSize: 25,
              fontWeight: "800",
              color: COLORS.textPrimary,
              textAlign: "center",
              marginBottom: 16,
              letterSpacing: 0.3,
            }}
          >
            {tutor.tutorProfile?.fullName || tutor.username}
          </Text>

          <View
            style={{
              backgroundColor: COLORS.background,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginBottom: 4 }}>Full Name</Text>
              <Text style={{ fontSize: 16, color: COLORS.textPrimary, fontWeight: "700" }}>{tutor.tutorProfile?.fullName || "N/A"}</Text>
            </View>

            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginBottom: 4 }}>Email</Text>
              <Text style={{ fontSize: 15, color: COLORS.textPrimary, fontWeight: "600" }}>{tutor.email || "N/A"}</Text>
            </View>

            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginBottom: 4 }}>Subject</Text>
              <Text style={{ fontSize: 15, color: COLORS.primary, fontWeight: "700" }}>{tutor.tutorProfile?.subject || "N/A"}</Text>
            </View>

            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginBottom: 4 }}>Experience</Text>
              <Text style={{ fontSize: 15, color: COLORS.primary, fontWeight: "800" }}>{getExperienceLabel(tutor.tutorProfile)}</Text>
            </View>

            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginBottom: 4 }}>Age</Text>
              <Text style={{ fontSize: 15, color: COLORS.textPrimary, fontWeight: "700" }}>{getAgeLabel(tutor.tutorProfile, tutor)}</Text>
            </View>

            <View style={{ paddingTop: 10, paddingBottom: 4 }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginBottom: 4 }}>Contact Number</Text>
              <Text style={{ fontSize: 15, color: COLORS.textPrimary, fontWeight: "700" }}>{tutor.tutorProfile?.mobileNumber || "N/A"}</Text>
            </View>
          </View>
        </>
      )}

      {renderSectionCard(
        <>
          <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 12 }}>Pricing</Text>
          <View
            style={{
              backgroundColor: COLORS.background,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: "600", marginBottom: 6 }}>Tutor Fee</Text>
            <Text style={{ fontSize: 30, fontWeight: "800", color: COLORS.primary, marginBottom: 6 }}>
              {getPriceLabel(tutor.tutorProfile)}
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textPrimary, fontWeight: "700" }}>
              {getPriceTypeLabel(tutor.tutorProfile?.priceType)}
            </Text>
          </View>
        </>
      )}

      {renderSectionCard(
        <>
          <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 12 }}>Availability</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {availabilitySlots.map((slot, index) => (
              <View
                key={`${slot}-${index}`}
                style={{
                  backgroundColor: COLORS.background,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: "700" }}>{formatAvailabilityLabel(slot)}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 10 }}>
            Availability may change. Please confirm session timing before booking.
          </Text>
        </>
      )}

      {renderSectionCard(
        <>
          <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 12 }}>Bio</Text>
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled showsVerticalScrollIndicator>
            <Text style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 }}>
              {tutor.tutorProfile?.bio || "N/A"}
            </Text>
          </ScrollView>
        </>
      )}

      {renderSectionCard(
        <>
          <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 12 }}>Your Rating</Text>
          <StarRating
            initialRating={studentRating}
            maxStars={5}
            size={30}
            filledColor={COLORS.primary}
            emptyColor={COLORS.border}
            onRatingChange={(value) => setStudentRating(value)}
          />
          <Text style={{ fontSize: 14, color: COLORS.textPrimary, fontWeight: "600", marginTop: 8 }}>
            Selected: {studentRating}/5
          </Text>

          <TouchableOpacity
            style={{
              marginTop: 12,
              backgroundColor: isSavingRating ? COLORS.border : COLORS.primary,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
            }}
            onPress={handleSubmitRating}
            disabled={isSavingRating}
            activeOpacity={0.85}
          >
            <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 14 }}>
              {isSavingRating ? "Saving..." : "Save Rating"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {renderSectionCard(
        <>
          <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 12 }}>Rating Breakdown</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <View style={{ alignItems: "center", marginRight: 16, minWidth: 72 }}>
              <Text style={{ fontSize: 34, fontWeight: "800", color: COLORS.textPrimary }}>{averageRating.toFixed(1)}</Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: "600" }}>Average</Text>
            </View>
            <View style={{ flex: 1 }}>
              <StarRating
                initialRating={Math.round(averageRating)}
                maxStars={5}
                size={18}
                filledColor={COLORS.primary}
                emptyColor={COLORS.border}
                disabled
              />
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 6 }}>
                Based on {reviewCount} student reviews
              </Text>
            </View>
          </View>

          {[...ratingBreakdown].map((row) => (
            <View key={`breakdown-${row.stars}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ width: 18, fontSize: 12, color: COLORS.textSecondary, fontWeight: "700" }}>{row.stars}</Text>
              <View style={{ flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 999, overflow: "hidden", marginHorizontal: 10 }}>
                <View style={{ width: `${row.percent}%`, height: "100%", backgroundColor: COLORS.primary, borderRadius: 999 }} />
              </View>
              <Text style={{ width: 36, fontSize: 12, color: COLORS.textPrimary, fontWeight: "700", textAlign: "right" }}>{row.count}</Text>
            </View>
          ))}
        </>
      )}

      {renderSectionCard(
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.textPrimary }}>Student Reviews</Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/tutor/reviews', params: { id } })}
              style={{ paddingHorizontal: 8, paddingVertical: 2 }}
              activeOpacity={0.7}
            >
              <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled showsVerticalScrollIndicator>
            {reviews.length === 0 ? (
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
                No reviews yet. Be the first student to leave feedback.
              </Text>
            ) : (
              reviews.map((review) => (
                <View
                  key={review.id}
                  style={{
                    backgroundColor: COLORS.background,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontSize: 14, color: COLORS.textPrimary, fontWeight: "800", marginBottom: 6 }}>{review.name}</Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginTop: 8 }}>
                    {review.comment || "No comment provided."}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
          {/* Feedback form for students */}
          <View style={{ marginTop: 18 }}>
            <Text style={{ fontSize: 14, color: COLORS.textPrimary, fontWeight: "700", marginBottom: 6 }}>Leave a feedback review</Text>
            <View style={{
              backgroundColor: COLORS.background,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 10,
              marginBottom: 10,
            }}>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>Your feedback (required):</Text>
              <TextInput
                style={{
                  minHeight: 40,
                  borderColor: COLORS.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 8,
                  color: COLORS.textPrimary,
                  backgroundColor: COLORS.inputBackground,
                  marginBottom: 8,
                }}
                placeholder="Write your feedback here..."
                placeholderTextColor={COLORS.textSecondary}
                value={feedbackComment}
                onChangeText={setFeedbackComment}
                multiline
                maxLength={400}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: isSavingFeedback ? COLORS.border : COLORS.primary,
                  borderRadius: 8,
                  paddingVertical: 8,
                  alignItems: "center",
                  marginTop: 4,
                }}
                onPress={handleSubmitFeedback}
                disabled={isSavingFeedback || !feedbackComment.trim()}
                activeOpacity={0.85}
              >
                <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 14 }}>
                  {isSavingFeedback ? "Submitting..." : "Submit Feedback"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>

      )}




      {renderSectionCard(
        <>
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 6,
              elevation: 2,
            }}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/book-session",
                params: {
                  id: tutor?._id,
                  tutorData: encodeURIComponent(JSON.stringify(tutor)),
                  returnTo: normalizedReturnTo
                    ? `/(tabs)/tutor/${tutor?._id}?returnTo=${encodeURIComponent(normalizedReturnTo)}`
                    : `/(tabs)/tutor/${tutor?._id}`,
                },
              })
            }
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 15, color: COLORS.white, fontWeight: "800" }}>Book Session</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: "center" }}>
            Students can book a session from this page.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
