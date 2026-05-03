import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../../store/authStore";
import { API_URL } from "../../../constants/api";
import { useColors } from "../../../hooks/useColors";
// import ProfileAvatar from "../../../components/ProfileAvatar";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";

export default function TutorReviewsPage() {
  const { id } = useLocalSearchParams();
  const { token } = useAuthStore();
  const COLORS = useColors();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editReview, setEditReview] = useState(null);
  const [editComment, setEditComment] = useState("");

  const { user } = useAuthStore();
  const router = useRouter();

  console.log('RENDERING REVIEWS', { user });

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id || id === "undefined") return;
      try {
        setLoading(true);
        setErrorMessage("");
        const response = await fetch(`${API_URL}/tutors/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data || data.error) {
          throw new Error(data.message || "Failed to fetch reviews");
        }
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      } catch (error) {
        setErrorMessage(error.message || "Failed to load reviews");
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [id, token]);

  // DEBUG: Show user object and review info
  useEffect(() => {
    console.log('RENDERING REVIEWS PAGE', { user });
  }, [user]);

  // Handler for deleting a review
  const handleDeleteReview = async (reviewId) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetch(`${API_URL}/tutorreviews/review/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.message || "Failed to delete review");
      }
      // Refresh reviews
      const refreshed = await fetch(`${API_URL}/tutors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshedData = await refreshed.json();
      setReviews(Array.isArray(refreshedData.reviews) ? refreshedData.reviews : []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete review");
    } finally {
      setLoading(false);
    }
  };

  // Handler for updating a review (open modal)
  const handleUpdateReview = (review) => {
    setEditReview(review);
    setEditComment(review.comment || "");
    setEditModalVisible(true);
  };

  // Handler for saving the edited review
  const handleSaveEdit = async () => {
    if (!editReview) return;
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetch(`${API_URL}/tutorreviews/review/${editReview.id}` , {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: editComment }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.message || "Failed to update review");
      }
      // Refresh reviews
      const refreshed = await fetch(`${API_URL}/tutors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshedData = await refreshed.json();
      setReviews(Array.isArray(refreshedData.reviews) ? refreshedData.reviews : []);
      setEditModalVisible(false);
      setEditReview(null);
      setEditComment("");
    } catch (error) {
      setErrorMessage(error.message || "Failed to update review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 16 }}>
      <TouchableOpacity
        onPress={() => {
          // If I am the tutor viewing my own reviews, go back to dashboard
          if (user?.role === 'tutor' && (user?._id === id || user?.id === id)) {
            router.replace('/(tabs)');
          } else {
            router.replace({ pathname: '/(tabs)/tutor/[id]', params: { id } });
          }
        }}
        style={{ marginBottom: 16, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border }}
        activeOpacity={0.7}
      >
        <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 15 }}>Back</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 18, textAlign: "center" }}>
        All Student Reviews
      </Text>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : errorMessage ? (
        <Text style={{ color: "#b42318", fontSize: 15, fontWeight: "700", textAlign: "center", marginTop: 40 }}>{errorMessage}</Text>
      ) : reviews.length === 0 ? (
        <Text style={{ color: COLORS.textPrimary, fontSize: 15, fontWeight: "700", textAlign: "center", marginTop: 40 }}>
          Debug: reviews.length = {reviews.length}
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator style={{ marginTop: 8 }}>
          {reviews.map((review) => {
            const myId = user?._id || user?.id;
            const reviewUserId = review.studentId || review.userId || review.user_id || review.student || review.authorId || review.author_id;
            const isMyReview = myId && reviewUserId && (`${myId}` === `${reviewUserId}`);
            return (
              <View key={review.id} style={{ backgroundColor: COLORS.cardBackground, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 16, flexDirection: "row", alignItems: "center", shadowColor: COLORS.shadow || '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 }}>
                {/* Fallback avatar: show a colored circle with initials or icon */}
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
                  <MaterialCommunityIcons name="account-circle" size={34} color={COLORS.primary} />
                </View>
                <View style={{ marginLeft: 14, flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, color: COLORS.textPrimary, fontWeight: "700", marginBottom: 2 }}>{review.name}</Text>
                  <Text style={{ fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 2 }}>{review.comment || "No comment provided."}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2, opacity: 0.7 }}>{review.createdAt ? new Date(review.createdAt).toLocaleString() : ""}</Text>
                </View>
                {isMyReview && (
                  <View style={{ flexDirection: "row", gap: 0, marginLeft: 10 }}>
                    <TouchableOpacity
                      style={{ marginRight: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 1, borderWidth: 0 }}
                      onPress={() => handleUpdateReview(review)}
                      accessibilityLabel="Update Review"
                    >
                      <MaterialCommunityIcons name="pencil" size={20} color={COLORS.primaryLight || '#6ea8fe'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ marginLeft: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fdf6f6', alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.error || '#e53935', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 1, borderWidth: 0 }}
                      onPress={() => handleDeleteReview(review.id)}
                      accessibilityLabel="Delete Review"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.errorLight || '#ff8a80'} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
      {/* Edit Review Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: COLORS.cardBackground, padding: 24, borderRadius: 16, width: '85%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>Edit Your Review</Text>
            <TextInput
              value={editComment}
              onChangeText={setEditComment}
              style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, minHeight: 60, color: COLORS.textPrimary, marginBottom: 16 }}
              multiline
              placeholder="Update your comment..."
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.border, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.textPrimary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.primary }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
