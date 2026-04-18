import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
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

export default function PendingTutorsPage() {
  const router = useRouter();
  const COLORS = useColors();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingTutors, setPendingTutors] = useState([]);
  const [busyTutorId, setBusyTutorId] = useState("");
  const [rejectTutor, setRejectTutor] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadPendingTutors = useCallback(async (isRefresh = false) => {
    try {
      if (String(user?.role || "") !== "admin") {
        setPendingTutors([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/tutors/admin/pending-tutors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load pending tutors");
      }

      setPendingTutors(Array.isArray(data?.tutors) ? data.tutors : []);
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to load pending tutors");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    loadPendingTutors(false);
  }, [loadPendingTutors]);

  const reviewTutor = useCallback(async (tutorId, decision, reason = "") => {
    if (!tutorId || String(user?.role || "") !== "admin") {
      return;
    }

    try {
      setBusyTutorId(String(tutorId));
      const response = await fetch(`${API_URL}/tutors/admin/users/${tutorId}/review`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision, reason }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to review tutor");
      }

      setPendingTutors((current) => current.filter((item) => String(item?._id) !== String(tutorId)));
      setRejectTutor(null);
      setRejectReason("");
      Alert.alert("Success", data?.message || "Tutor review updated");
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to update tutor review");
    } finally {
      setBusyTutorId("");
    }
  }, [token, user?.role]);

  const confirmAccept = (tutor) => {
    Alert.alert(
      "Accept tutor",
      `Approve ${tutor?.tutorProfile?.fullName || tutor?.username || "this tutor"}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", onPress: () => reviewTutor(tutor._id, "accept") },
      ],
    );
  };

  const confirmReject = () => {
    if (!rejectTutor?._id) return;
    reviewTutor(rejectTutor._id, "reject", rejectReason);
  };

  const styles = useMemo(() => StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 64,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    titleWrap: {
      flex: 1,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: 24,
      fontWeight: "900",
    },
    subtitle: {
      color: COLORS.textSecondary,
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
    },
    infoBar: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 16,
      padding: 14,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    infoBarText: {
      color: COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    card: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 18,
      padding: 16,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    topRow: {
      flexDirection: "row",
      gap: 12,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 14,
      backgroundColor: COLORS.inputBackground,
    },
    name: {
      color: COLORS.textPrimary,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 2,
    },
    email: {
      color: COLORS.textSecondary,
      fontSize: 12,
      marginBottom: 4,
    },
    subject: {
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 2,
    },
    chip: {
      alignSelf: "flex-start",
      marginTop: 6,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: COLORS.inputBackground,
    },
    chipText: {
      color: COLORS.textSecondary,
      fontWeight: "800",
      fontSize: 11,
    },
    rejectNote: {
      marginTop: 8,
      color: COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    actions: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingTop: 12,
      flexDirection: "row",
      gap: 10,
    },
    acceptButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.primary,
    },
    acceptText: {
      color: COLORS.white,
      fontWeight: "900",
      fontSize: 13,
    },
    rejectButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: COLORS.error || COLORS.primary,
      backgroundColor: `${(COLORS.error || COLORS.primary)}12`,
    },
    rejectText: {
      color: COLORS.error || COLORS.primary,
      fontWeight: "900",
      fontSize: 13,
    },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 40,
      paddingHorizontal: 20,
    },
    emptyText: {
      color: COLORS.textSecondary,
      marginTop: 10,
      textAlign: "center",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.65)",
      justifyContent: "center",
      padding: 18,
    },
    modalSheet: {
      borderRadius: 22,
      backgroundColor: COLORS.cardBackground,
      padding: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    modalTitle: {
      color: COLORS.textPrimary,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 8,
    },
    modalHint: {
      color: COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 12,
    },
    textArea: {
      minHeight: 110,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.inputBackground,
      color: COLORS.textPrimary,
      padding: 12,
      textAlignVertical: "top",
      fontSize: 14,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 14,
    },
    modalCancel: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.inputBackground,
    },
    modalCancelText: {
      color: COLORS.textPrimary,
      fontWeight: "800",
    },
    modalReject: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.error || COLORS.primary,
    },
    modalRejectText: {
      color: COLORS.white,
      fontWeight: "900",
    },
  }), [COLORS]);

  const renderItem = ({ item }) => {
    const isBusy = String(busyTutorId) === String(item?._id);
    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <UserAvatar uri={item?.profileImage} size={styles.avatar?.width || 72} borderRadius={styles.avatar?.borderRadius || 36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item?.tutorProfile?.fullName || item?.username || "Tutor"}</Text>
            <Text style={styles.email}>{item?.email || "N/A"}</Text>
            <Text style={styles.subject}>{item?.tutorProfile?.subject || "N/A"}</Text>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Pending Review</Text>
            </View>
            {item?.rejectionReason ? <Text style={styles.rejectNote}>Last reason: {item.rejectionReason}</Text> : null}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.acceptButton, { opacity: isBusy ? 0.7 : 1 }]}
            disabled={isBusy}
            onPress={() => confirmAccept(item)}
          >
            {isBusy ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.acceptText}>Accept</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectButton, { opacity: isBusy ? 0.7 : 1 }]}
            disabled={isBusy}
            onPress={() => {
              setRejectTutor(item);
              setRejectReason("");
            }}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (String(user?.role || "") !== "admin") {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: COLORS.textSecondary, fontWeight: "800" }}>Admin access required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark || COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Pending Tutors</Text>
          <Text style={styles.subtitle}>Review new tutor registrations and decide whether to accept or reject them.</Text>
        </View>
      </View>

      <View style={styles.infoBar}>
        <Text style={styles.infoBarText}>
          New tutor registrations stay here until you accept them. Rejection reason is optional, and approved tutors appear on the home page immediately.
        </Text>
      </View>

      <FlatList
        data={pendingTutors}
        keyExtractor={(item) => String(item?._id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPendingTutors(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="hourglass-outline" size={42} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No pending tutor requests right now.</Text>
          </View>
        }
      />

      <Modal visible={Boolean(rejectTutor)} transparent animationType="fade" onRequestClose={() => setRejectTutor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Reject Tutor</Text>
            <Text style={styles.modalHint}>
              Optional: add a reason for rejection. The tutor will receive the note if provided.
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason for rejection (optional)"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.textArea}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectTutor(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalReject} onPress={confirmReject}>
                {busyTutorId ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalRejectText}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}