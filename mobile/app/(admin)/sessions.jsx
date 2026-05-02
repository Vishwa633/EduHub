import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";

const statusLabel = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "accepted") return "Accepted";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "funds_held") return "Funds Held";
  if (normalized === "completed_by_tutor") return "Completed By Tutor";
  if (normalized === "released") return "Released";
  if (normalized === "disputed") return "Disputed";
  if (normalized === "refunded") return "Refunded";
  return "Pending";
};

export default function AdminSessionsPage() {
  const router = useRouter();
  const COLORS = useColors();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({ totalSessions: 0, page: 1, totalPages: 1 });

  const loadSessions = useCallback(async (isRefresh = false) => {
    try {
      if (String(user?.role || "") !== "admin") {
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

      const response = await fetch(`${API_URL}/bookings/admin/sessions?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load sessions");
      }

      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      setSummary({
        totalSessions: Number(data?.totalSessions || 0),
        page: Number(data?.page || 1),
        totalPages: Number(data?.totalPages || 1),
      });
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to load sessions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    loadSessions(false);
  }, [loadSessions]);

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
    },
    statsBar: {
      marginHorizontal: 20,
      marginBottom: 14,
      borderRadius: 16,
      padding: 14,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    statBlock: {
      flex: 1,
    },
    statLabel: {
      color: COLORS.textSecondary,
      fontSize: 12,
      fontWeight: "700",
    },
    statValue: {
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 4,
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
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 7,
    },
    label: {
      color: COLORS.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      flex: 1,
    },
    value: {
      color: COLORS.textPrimary,
      fontSize: 12,
      fontWeight: "800",
      flex: 1,
      textAlign: "right",
    },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "800",
    },
    empty: {
      alignItems: "center",
      paddingTop: 40,
      paddingHorizontal: 20,
    },
    emptyText: {
      color: COLORS.textSecondary,
      marginTop: 10,
      textAlign: "center",
    },
    actionButton: {
      marginTop: 12,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.primary,
    },
    actionText: {
      color: COLORS.white,
      fontWeight: "800",
    },
  }), [COLORS]);

  const renderItem = ({ item }) => {
    const paymentStatus = String(item?.payment?.status || "not_created").toLowerCase();
    const sessionStatus = String(item?.status || "pending").toLowerCase();
    const isPending = sessionStatus === "pending";
    const statusBg = paymentStatus === "disputed" ? "#fee2e2" : paymentStatus === "released" ? "#dcfce7" : paymentStatus === "refunded" ? "#dbeafe" : COLORS.inputBackground;
    const statusText = paymentStatus === "disputed" ? "#991b1b" : paymentStatus === "released" ? "#166534" : paymentStatus === "refunded" ? "#1d4ed8" : COLORS.textSecondary;

    return (
      <View style={styles.card}>
        <View style={[styles.badge, { backgroundColor: isPending ? "#fef3c7" : statusBg, borderWidth: isPending ? 1 : 0, borderColor: isPending ? "#f59e0b" : "transparent" }]}>
          {isPending && <Ionicons name="alert-circle" size={14} color="#f59e0b" style={{ marginRight: 6 }} />}
          <Text style={[styles.badgeText, { color: isPending ? "#92400e" : statusText }]}>{statusLabel(item?.status)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Subject</Text>
          <Text style={styles.value}>{item?.subject || "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Student</Text>
          <Text style={styles.value}>{item?.student?.username || item?.studentName || "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tutor</Text>
          <Text style={styles.value}>{item?.tutor?.tutorProfile?.fullName || item?.tutorName || item?.tutor?.username || "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{item?.sessionDate ? new Date(item.sessionDate).toDateString() : "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>{item?.sessionTime || "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment</Text>
          <Text style={styles.value}>{item?.payment?.status ? statusLabel(item.payment.status) : "Not created"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>LKR {Number(item?.payment?.amount || item?.price || 0).toLocaleString()}</Text>
        </View>

        {String(item?.payment?.status || "") === "disputed" ? (
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/(admin)/admin-disputes") }>
            <Text style={styles.actionText}>Open Dispute Review</Text>
          </TouchableOpacity>
        ) : null}
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
          <Text style={styles.title}>Sessions</Text>
          <Text style={styles.subtitle}>Every booking, payment status, and escrow stage in one list.</Text>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Total Sessions</Text>
          <Text style={styles.statValue}>{summary.totalSessions}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Showing</Text>
          <Text style={styles.statValue}>{sessions.length}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Page</Text>
          <Text style={styles.statValue}>{summary.page}/{summary.totalPages}</Text>
        </View>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item?._id || item?.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={42} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No sessions found.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
