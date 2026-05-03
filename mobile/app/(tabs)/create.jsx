import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const statusLabel = (value) => {
  const normalized = normalizeStatus(value);
  if (normalized === "accepted") return "Accepted";
  if (normalized === "paid") return "Paid Successfully";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "funds_held") return "Funds Held";
  if (normalized === "completed_by_tutor") return "Completed";
  if (normalized === "released") return "Released";
  if (normalized === "disputed") return "Disputed";
  if (normalized === "refunded") return "Refunded";
  return "Pending";
};

export default function SessionsPage() {
  const router = useRouter();
  const COLORS = useColors();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isStudent = String(user?.role || "") === "student";
  const isTutor = String(user?.role || "") === "tutor";

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const statusStyles = useMemo(() => ({
    pending: { bg: "#fef9c3", text: "#854d0e", border: "#eab308" },
    accepted: { bg: "#dcfce7", text: "#166534", border: "#166534" },
    paid: { bg: "#dcfce7", text: "#166534", border: "#166534" },
    rejected: { bg: "#fee2e2", text: "#991b1b", border: "#991b1b" },
    default: { bg: COLORS.inputBackground, text: COLORS.textSecondary, border: COLORS.border },
  }), [COLORS.inputBackground, COLORS.textSecondary, COLORS.border]);

  const buildReceiptRoute = useCallback((item) => {
    const bookingId = String(item?._id || item?.id || "").trim();
    const payment = item?.payment || {};
    const paymentStatus = normalizeStatus(payment?.status);
    const customerName = isStudent
      ? user?.username || user?.name || item?.studentName || "Customer"
      : item?.studentName || item?.student?.username || "Customer"
    ;
    const paymentMethod = String(payment?.paymentMethod || payment?.method || `Card **** ${bookingId.slice(-4) || "0000"}`);

    return {
      pathname: "/(tabs)/payment-success",
      params: {
        amount: String(Number(payment?.amount ?? item?.price ?? 0)),
        transactionId: String(payment?.id || payment?._id || `TXN-${bookingId || Date.now()}`),
        paymentMethod,
        subject: String(item?.subject || "Session"),
        sessionDate: String(item?.sessionDate || ""),
        sessionTime: String(item?.sessionTime || "N/A"),
        bookingId,
        customerName,
        tutorName: String(item?.tutorName || item?.tutor?.tutorProfile?.fullName || item?.tutor?.username || "Tutor"),
        returnTo: "/(tabs)/create",
        receiptMode: paymentStatus || "pending",
      },
    };
  }, [isStudent, user?.name, user?.username]);

  const loadSessions = useCallback(async (isRefresh = false) => {
    try {
      if (!token || (!isStudent && !isTutor)) {
        setSessions([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const endpoint = isTutor ? `${API_URL}/bookings/tutor` : `${API_URL}/bookings/student`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load sessions");
      }

      setSessions(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError?.message || "Unable to load sessions.");
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isStudent, isTutor]);

  useEffect(() => {
    loadSessions(false);
  }, [loadSessions]);

  useFocusEffect(
    useCallback(() => {
      loadSessions(false);
    }, [loadSessions]),
  );

  const sortedSessions = useMemo(() => {
    const source = isTutor
      ? sessions.filter((entry) => {
          const bookingStatus = normalizeStatus(entry?.status);
          const paymentStatus = normalizeStatus(entry?.payment?.status);
          const hasHeldPayment = Boolean(entry?.payment) && paymentStatus === "pending";
          return hasHeldPayment || ["pending", "accepted", "funds_held", "completed_by_tutor", "released", "disputed", "refunded"].includes(bookingStatus);
        })
      : sessions;

    return [...source].sort((a, b) => {
      const statusA = normalizeStatus(a?.status);
      const statusB = normalizeStatus(b?.status);
      
      // Pending sessions go to top
      if (statusA === "pending" && statusB !== "pending") return -1;
      if (statusB === "pending" && statusA !== "pending") return 1;
      
      // Otherwise sort by date (newest first)
      const dateA = new Date(a?.sessionDate || 0).getTime();
      const dateB = new Date(b?.sessionDate || 0).getTime();
      return dateB - dateA;
    });
  }, [sessions, isTutor]);

  const deleteSession = useCallback(async (bookingId) => {
    try {
      setDeletingId(String(bookingId));

      const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to cancel session");
      }

      setSessions((current) => current.filter((entry) => String(entry?._id || entry?.id) !== String(bookingId)));
      Alert.alert("Cancelled", data?.message || "Session removed successfully.");
    } catch (deleteError) {
      Alert.alert("Error", deleteError?.message || "Unable to cancel session.");
    } finally {
      setDeletingId("");
    }
  }, [token]);

  const confirmDeleteSession = useCallback((bookingId) => {
    Alert.alert(
      "Cancel Session",
      "Are you sure you want to cancel/delete this session?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => deleteSession(bookingId),
        },
      ],
    );
  }, [deleteSession]);

  const updateSessionStatus = useCallback(async (bookingId, status) => {
    try {
      setUpdatingId(String(bookingId));

      const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update session status");
      }

      if (String(status) === "rejected") {
        setSessions((current) => current.filter((entry) => String(entry?._id || entry?.id) !== String(bookingId)));
        return;
      }

      setSessions((current) =>
        current.map((entry) => (String(entry?._id || entry?.id) === String(bookingId) ? data : entry)),
      );
    } catch (statusError) {
      Alert.alert("Error", statusError?.message || "Unable to update session status.");
    } finally {
      setUpdatingId("");
    }
  }, [token]);

  const renderSession = ({ item }) => {
    const bookingId = String(item?._id || item?.id || "").trim();
    const bookingStatus = normalizeStatus(item?.status);
    const paymentStatus = normalizeStatus(item?.payment?.status);
    const status = normalizeStatus(item?.payment?.status || item?.status);
    const hasPayment = !!item?.payment;
    const isPaidSession = isStudent && hasPayment && ["pending", "released", "refunded"].includes(status);
    const isTutorPaymentSecured = isTutor && hasPayment && paymentStatus === "pending";
    const statusStyle = statusStyles[isPaidSession ? "paid" : isTutorPaymentSecured ? "accepted" : bookingStatus] || statusStyles.default;
    const displayStatus = isPaidSession
      ? "Paid Successfully"
      : isTutorPaymentSecured
        ? "Student Paid (Funds Held)"
        : statusLabel(item?.status);
    const showRemoveForStudent = isStudent && ["accepted", "rejected", "funds_held", "completed_by_tutor", "released", "disputed", "refunded"].includes(bookingStatus);
    const canOpenPayment = isTutor
      ? hasPayment || ["accepted", "funds_held", "completed_by_tutor", "released", "disputed", "refunded"].includes(bookingStatus)
      : ["accepted", "funds_held", "completed_by_tutor", "released", "disputed", "refunded"].includes(bookingStatus);
    const canOpenReceipt = isStudent && hasPayment;
    const isPendingTutorRequest = isTutor && bookingStatus === "pending" && !item?.respondedAt;
    const isDeleting = deletingId === bookingId;
    const isUpdating = updatingId === bookingId;
    const counterpartLabel = isTutor ? "Student" : "Tutor";
    const counterpartName = isTutor
      ? item?.studentName || item?.student?.username || "N/A"
      : item?.tutorName || item?.tutor?.username || "N/A";

    return (
      <View
        style={{
          backgroundColor: COLORS.cardBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 14,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: COLORS.textPrimary, fontWeight: "900", fontSize: 16, marginBottom: 6 }}>
          {item?.subject || "Session"}
        </Text>
        <Text style={{ color: COLORS.textSecondary, marginBottom: 2 }}>
          {counterpartLabel}: <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>{counterpartName}</Text>
        </Text>
        <Text style={{ color: COLORS.textSecondary, marginBottom: 2 }}>
          Date: <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>{item?.sessionDate ? new Date(item.sessionDate).toDateString() : "N/A"}</Text>
        </Text>
        <Text style={{ color: COLORS.textSecondary, marginBottom: 6 }}>
          Time: <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>{item?.sessionTime || "N/A"}</Text>
        </Text>

        <View
          style={{
            alignSelf: "flex-start",
            borderRadius: 999,
            backgroundColor: statusStyle.bg,
            borderWidth: 1,
            borderColor: statusStyle.border,
            paddingHorizontal: 10,
            paddingVertical: 5,
            marginBottom: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {bookingStatus === "pending" && <Ionicons name="alert-circle" size={12} color={statusStyle.text} style={{ marginRight: 6 }} />}
          <Text style={{ color: statusStyle.text, fontWeight: "800", fontSize: 11 }}>
            {displayStatus}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {isPendingTutorRequest && bookingId ? (
            <>
              <TouchableOpacity
                onPress={() => updateSessionStatus(bookingId, "accepted")}
                disabled={isUpdating}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.primary,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isUpdating ? 0.75 : 1,
                }}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: "800" }}>Accept</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => updateSessionStatus(bookingId, "rejected")}
                disabled={isUpdating}
                style={{
                  flex: 1,
                  backgroundColor: `${COLORS.textDark || COLORS.primary}12`,
                  borderColor: COLORS.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isUpdating ? 0.75 : 1,
                }}
              >
                <Text style={{ color: COLORS.textSecondary, fontWeight: "800" }}>Reject</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {bookingId && (canOpenReceipt || canOpenPayment) ? (
            <TouchableOpacity
              onPress={() => router.push(canOpenReceipt ? buildReceiptRoute(item) : {
                pathname: "/(tabs)/booking-payment",
                params: {
                  bookingId,
                  returnTo: "/(tabs)/create",
                },
              })}
              style={{
                flex: 1,
                backgroundColor: COLORS.primary,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Ionicons name="open-outline" size={16} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontWeight: "800" }}>
                {canOpenReceipt ? "View Receipt" : isTutor ? "Open Session Status" : "Open Session"}
              </Text>
            </TouchableOpacity>
          ) : null}

          {!(isTutor && isPendingTutorRequest) ? (
            <TouchableOpacity
              onPress={() => confirmDeleteSession(bookingId)}
              disabled={isDeleting || !bookingId}
              style={{
                minWidth: 118,
                backgroundColor: `${COLORS.textDark || COLORS.primary}12`,
                borderColor: COLORS.border,
                borderWidth: 1,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 10,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                opacity: isDeleting ? 0.75 : 1,
              }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={COLORS.textSecondary} />
              ) : (
                <Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} />
              )}
              <Text style={{ color: COLORS.textSecondary, fontWeight: "800" }}>
                {isDeleting ? (showRemoveForStudent ? "Removing..." : "Cancelling...") : (showRemoveForStudent ? "Remove" : "Cancel")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isStudent && !isTutor) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Text style={{ color: COLORS.textSecondary, fontWeight: "700", textAlign: "center" }}>
          Sessions tab is available for student and tutor accounts.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: 26, fontWeight: "900" }}>My Sessions</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 2 }}>
          {isTutor ? "Sessions booked with you." : "Sessions you have booked."}
        </Text>
      </View>

      {!!error ? (
        <View style={{ marginHorizontal: 16, marginBottom: 10, padding: 10, borderRadius: 10, backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ color: COLORS.textSecondary, fontWeight: "700" }}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={sortedSessions}
        keyExtractor={(item) => String(item?._id || item?.id || Math.random())}
        renderItem={renderSession}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSessions(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 40 }}>
            <Ionicons name="calendar-clear-outline" size={42} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, marginTop: 10, textAlign: "center" }}>
              {isTutor
                ? "No sessions yet. New requests will appear here."
                : "No booked sessions yet."}
            </Text>
          </View>
        }
      />
    </View>
  );
}