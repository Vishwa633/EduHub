import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();
const statusLabel = (value) => {
  const normalized = normalizeStatus(value);
  if (normalized === "accepted") return "Accepted";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "paid") return "Paid";
  if (normalized === "funds_held") return "Funds Held";
  if (normalized === "completed_by_tutor") return "Completed By Tutor";
  if (normalized === "released") return "Released";
  if (normalized === "disputed") return "Disputed";
  if (normalized === "refunded") return "Refunded";
  return "Pending";
};

export default function TutorNotificationsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, user } = useAuthStore();
  const COLORS = useColors();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeRejectId, setActiveRejectId] = useState(null);
  const [rejectReasons, setRejectReasons] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [clearingAll, setClearingAll] = useState(false);
  const isTutor = user?.role === "tutor";
  const isStudent = user?.role === "student";
  const isAdmin = user?.role === "admin";
  const messagesOnly = isTutor || String(params?.messagesOnly || "") === "1";
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const markAlertsAsRead = useCallback(async (items) => {
    const unreadItems = (Array.isArray(items) ? items : []).filter((item) => item?._id && item?.isRead !== true);
    if (!unreadItems.length || !token) {
      return;
    }

    await Promise.allSettled(
      unreadItems.map((item) =>
        fetch(`${API_URL}/payments/alerts/${item._id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    );
  }, [token]);

  const handleBack = () => {
    if (returnTo) {
      router.replace(returnTo);
      return;
    }

    if (isAdmin) {
      router.replace("/(admin)");
      return;
    }

    router.back();
  };

  const loadBookings = useCallback(async (showRefreshing = false) => {
    try {
      if (!token || (!isTutor && !isStudent && !isAdmin)) {
        setBookings([]);
        setAlerts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const endpoint = messagesOnly
        ? null
        : isTutor
          ? `${API_URL}/bookings/tutor`
          : isStudent
            ? `${API_URL}/bookings/student`
            : null;
      const [bookingsResponse, alertsResponse] = await Promise.all([
        endpoint
          ? fetch(endpoint, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve({ ok: true, json: async () => [] }),
        fetch(`${API_URL}/payments/alerts/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const bookingsData = await bookingsResponse.json();
      const alertsData = await alertsResponse.json();

      if (!bookingsResponse.ok) {
        throw new Error(bookingsData?.message || "Failed to load booking notifications");
      }

      if (!alertsResponse.ok) {
        throw new Error(alertsData?.message || "Failed to load payment alerts");
      }

      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      const safeAlerts = Array.isArray(alertsData) ? alertsData : [];
      setAlerts(
        safeAlerts.map((item) => ({
          ...item,
          isRead: true,
          justSeen: item?.isRead !== true,
        })),
      );
      markAlertsAsRead(safeAlerts);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isTutor, isStudent, isAdmin, messagesOnly, markAlertsAsRead]);

  useEffect(() => {
    loadBookings(false);
  }, [loadBookings]);

  const updateStatus = async (bookingId, status, tutorMessage = "") => {
    try {
      setUpdatingId(bookingId);

      const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, tutorMessage }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update booking status");
      }

      setBookings((current) => current.map((item) => (String(item?._id || item?.id) === String(bookingId) ? data : item)));
      if (status === "rejected") {
        setActiveRejectId(null);
        setRejectReasons((current) => ({ ...current, [bookingId]: "" }));
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update booking status");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteNotification = async (bookingId) => {
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete notification");
      }

      setBookings((current) => current.filter((item) => String(item?._id || item?.id) !== String(bookingId)));
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to delete notification");
    }
  };

  const confirmDeleteNotification = (bookingId) => {
    Alert.alert("Delete notification", "Are you sure you want to delete this notification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteNotification(bookingId),
      },
    ]);
  };

  const clearAllNotifications = useCallback(async () => {
    if (!token) {
      return;
    }

    const totalOnScreen = bookings.length + alerts.length;
    if (!totalOnScreen) {
      Alert.alert("Nothing to clear", "No notifications available to clear.");
      return;
    }

    try {
      setClearingAll(true);

      if (alerts.length) {
        const alertsResponse = await fetch(`${API_URL}/payments/alerts/me`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!alertsResponse.ok) {
          const data = await alertsResponse.json().catch(() => ({}));
          throw new Error(data?.message || "Failed to clear alerts");
        }
      }

      if (bookings.length) {
        const bookingResults = await Promise.allSettled(
          bookings
            .map((item) => String(item?._id || item?.id || "").trim())
            .filter(Boolean)
            .map((id) =>
              fetch(`${API_URL}/bookings/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              }),
            ),
        );

        const failedBookingDelete = bookingResults.some((result) => {
          if (result.status !== "fulfilled") {
            return true;
          }
          return !result.value.ok;
        });

        if (failedBookingDelete) {
          throw new Error("Some notifications could not be cleared. Please try again.");
        }
      }

      setBookings([]);
      setAlerts([]);
      await loadBookings(true);
      Alert.alert("Cleared", "All notifications were cleared.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to clear notifications");
    } finally {
      setClearingAll(false);
    }
  }, [alerts.length, bookings, loadBookings, token]);

  const statusStyles = useMemo(() => ({
    pending: { bg: "#fff7ed", text: "#c2410c" },
    accepted: { bg: "#dcfce7", text: "#166534" },
    rejected: { bg: "#fee2e2", text: "#991b1b" },
    paid: { bg: COLORS.inputBackground, text: COLORS.textDark },
    funds_held: { bg: "#fef3c7", text: "#92400e" },
    completed_by_tutor: { bg: "#fef3c7", text: "#92400e" },
    released: { bg: "#dcfce7", text: "#166534" },
    disputed: { bg: "#fee2e2", text: "#991b1b" },
    refunded: { bg: "#dcfce7", text: "#166534" },
  }), [COLORS]);

  const alertLevelStyles = useMemo(() => ({
    info: { bg: COLORS.cardBackground, border: COLORS.border, icon: COLORS.primary },
    warning: { bg: "#fefce8", border: "#fde68a", icon: "#ca8a04" },
    critical: { bg: "#fef2f2", border: "#fecaca", icon: "#dc2626" },
  }), [COLORS]);

  const markSessionCompleted = async (bookingId) => {
    try {
      setUpdatingId(bookingId);

      const response = await fetch(`${API_URL}/payments/${bookingId}/tutor-complete`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to mark session completed");
      }

      Alert.alert("Updated", "Student has been asked to confirm this session.");
      loadBookings(true);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to mark session completed");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark || COLORS.primary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]}>Notifications</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
            {messagesOnly
              ? "System messages"
              : isTutor
                ? "Student booking requests"
                : isAdmin
                  ? "Admin alerts and disputes"
                  : "Tutor booking updates"}
          </Text>
        </View>
        <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={clearAllNotifications}
            disabled={clearingAll || loading || refreshing || (!alerts.length && !bookings.length)}
            style={{
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              backgroundColor: COLORS.cardBackground,
              borderWidth: 1,
              borderColor: COLORS.primary,
              opacity: clearingAll || loading || refreshing || (!alerts.length && !bookings.length) ? 0.55 : 1,
            }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: "800" }}>{clearingAll ? "Clearing..." : "Clear All"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item?._id || item?.id)}
        ListHeaderComponent={
          alerts.length ? (
            <View style={{ marginBottom: 12 }}>
              {alerts.map((alert) => {
                const levelStyle = alertLevelStyles[alert.level] || alertLevelStyles.info;
                const isJustSeen = alert?.justSeen === true;
                return (
                  <View
                    key={String(alert._id || alert.id)}
                    style={[
                      styles.alertCard,
                      {
                        backgroundColor: isJustSeen ? `${COLORS.primary}12` : levelStyle.bg,
                        borderColor: isJustSeen ? COLORS.primary : levelStyle.border,
                      },
                    ]}
                  >
                    <Ionicons name="notifications-outline" size={18} color={isJustSeen ? COLORS.primary : levelStyle.icon} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: isJustSeen ? COLORS.primary : COLORS.textPrimary, fontWeight: "800" }}>{alert.title || "Notification"}</Text>
                      <Text style={{ color: COLORS.textSecondary, marginTop: 2 }}>{alert.message || ""}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadBookings(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
            <Ionicons name="notifications-outline" size={36} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textPrimary, fontWeight: "800", marginTop: 12 }}>
              {isTutor ? "No booking requests yet" : "No notifications yet"}
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 4, textAlign: "center" }}>
              {isTutor
                ? "New session bookings will appear here for approval or rejection."
                : "Booking status updates from tutors will appear here."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = normalizeStatus(item?.status);
          const chip = statusStyles[status] || statusStyles.pending;
          const titleName = isTutor
            ? item?.studentName || item?.student?.username || "Student"
            : item?.tutorName || item?.tutor?.tutorProfile?.fullName || item?.tutor?.username || "Tutor";
          const sessionDate = item?.sessionDate ? new Date(item.sessionDate).toDateString() : "N/A";
          const isPending = status === "pending";
          const isFundsHeld = status === "funds_held";
          const isCompletedByTutor = status === "completed_by_tutor";
          const hasTutorResponded = Boolean(item?.respondedAt);
          const showTutorDecisionActions = isTutor && isPending && !hasTutorResponded;
          const canOpenSessionProtection = isStudent && ["accepted", "funds_held", "completed_by_tutor", "disputed", "released", "refunded"].includes(status);
          const canDeleteNotification = !(isStudent && ["accepted", "funds_held", "completed_by_tutor", "disputed", "released", "refunded", "paid"].includes(status));
          const bookingId = String(item?._id || item?.id || "").trim();
          const rejectReason = String(rejectReasons[bookingId] || "");

          const studentMessage = status === "accepted"
            ? "Tutor accepted your session. Tap to go to payment."
            : status === "rejected"
              ? item?.tutorMessage
                ? `Tutor rejected your session request.\nReason: ${item.tutorMessage}`
                : "Tutor rejected your session request."
              : status === "paid"
                ? "Payment completed for this session."
                : status === "completed_by_tutor"
                  ? "Tutor marked this session completed. Confirm now to release payment."
                  : status === "funds_held"
                    ? "Payment is protected. Waiting for tutor to mark session completed."
                    : status === "released"
                      ? "Payment was released to the tutor."
                      : status === "disputed"
                        ? "Dispute opened. Admin review is in progress."
                : "Booking request sent. Waiting for tutor response.";

          return (
            <TouchableOpacity
              activeOpacity={canOpenSessionProtection ? 0.85 : 1}
              disabled={!canOpenSessionProtection}
              onPress={() =>
                canOpenSessionProtection
                  ? router.push({
                      pathname: "/(tabs)/booking-payment",
                      params: {
                        bookingId,
                        returnTo: "/(tabs)/notifications",
                      },
                    })
                  : null
              }
              style={[styles.card, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}
            >
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.textPrimary, fontWeight: "800", fontSize: 15 }}>{titleName}</Text>
                  <Text style={{ color: COLORS.textSecondary, marginTop: 2 }}>{item?.subject || "Session request"}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
                  <Text style={{ color: chip.text, fontWeight: "800", fontSize: 12 }}>{statusLabel(item?.status)}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={{ color: COLORS.textSecondary }}>Date</Text>
                <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>{sessionDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={{ color: COLORS.textSecondary }}>Time</Text>
                <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>{item?.sessionTime || "N/A"}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={{ color: COLORS.textSecondary }}>Mode</Text>
                <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>{item?.sessionMode || "online"}</Text>
              </View>

              {item?.notes ? (
                <Text style={{ color: COLORS.textSecondary, marginTop: 10, lineHeight: 20 }}>
                  {item.notes}
                </Text>
              ) : null}

              {canDeleteNotification ? (
                <View style={styles.deleteRow}>
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: COLORS.border }]}
                    onPress={() => confirmDeleteNotification(bookingId)}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={{ color: COLORS.textSecondary, fontWeight: "700" }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {isStudent ? (
                <Text style={{ color: COLORS.textSecondary, marginTop: 10, lineHeight: 20 }}>
                  {studentMessage}
                </Text>
              ) : null}

              {showTutorDecisionActions ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.rejectButton, { borderColor: COLORS.border }]}
                    onPress={() => setActiveRejectId((current) => (current === bookingId ? null : bookingId))}
                    disabled={updatingId === item._id}
                  >
                    <Text style={{ color: COLORS.textPrimary, fontWeight: "800" }}>
                      {activeRejectId === bookingId ? "Cancel" : "Reject"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: COLORS.primary }]}
                    onPress={() => updateStatus(item._id, "accepted")}
                    disabled={updatingId === item._id}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: "800" }}>Accept</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {isTutor && isFundsHeld ? (
                <View style={styles.actionRow}>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: COLORS.primary }]}
                    onPress={() => markSessionCompleted(bookingId)}
                    disabled={updatingId === bookingId}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: "800" }}>
                      {updatingId === bookingId ? "Saving..." : "Mark as Completed"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {isTutor && isCompletedByTutor ? (
                <View style={[styles.waitingChip, { borderColor: "#fde68a", backgroundColor: "#fefce8" }]}>
                  <Ionicons name="time-outline" size={16} color="#ca8a04" />
                  <Text style={{ color: "#854d0e", fontWeight: "700" }}>Waiting for student confirmation</Text>
                </View>
              ) : null}

              {showTutorDecisionActions && activeRejectId === bookingId ? (
                <View style={styles.rejectReasonWrap}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>
                    Reject reason (optional)
                  </Text>
                  <TextInput
                    value={rejectReason}
                    onChangeText={(value) =>
                      setRejectReasons((current) => ({
                        ...current,
                        [bookingId]: value,
                      }))
                    }
                    placeholder="Add a reason (optional)"
                    placeholderTextColor={COLORS.placeholderText}
                    style={[
                      styles.rejectInput,
                      {
                        borderColor: COLORS.border,
                        backgroundColor: COLORS.inputBackground,
                        color: COLORS.textPrimary,
                      },
                    ]}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.sendRejectButton, { backgroundColor: COLORS.primary }]}
                    disabled={updatingId === bookingId}
                    onPress={() => updateStatus(bookingId, "rejected", rejectReason)}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: "800" }}>
                      {updatingId === bookingId ? "Sending..." : "Confirm Reject"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {canOpenSessionProtection ? (
                <View style={styles.actionRow}>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: COLORS.primary }]}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/booking-payment",
                        params: {
                          bookingId,
                          returnTo: "/(tabs)/notifications",
                        },
                      })
                    }
                  >
                    <Ionicons name="card-outline" size={16} color={COLORS.white} />
                    <Text style={{ color: COLORS.white, fontWeight: "800" }}>Open Details</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  deleteRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  acceptButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  rejectReasonWrap: {
    marginTop: 12,
  },
  rejectInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 70,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: "top",
  },
  sendRejectButton: {
    marginTop: 10,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 11,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginTop: 40,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  waitingChip: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});