import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";

export default function Payments() {
  const { token, user } = useAuthStore();
  const COLORS = useColors();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`${API_URL}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch payments");

      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Error fetching payments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "released":
        return { bg: "#dcfce7", text: "#166534" }; // Green
      case "disputed":
        return { bg: "#fee2e2", text: "#991b1b" }; // Red
      case "refunded":
        return { bg: "#fef3c7", text: "#92400e" }; // Yellow/Amber
      case "pending":
        return { bg: "#e0f2fe", text: "#075985" }; // Blue
      default:
        return { bg: COLORS.inputBackground, text: COLORS.textSecondary };
    }
  };

  const renderPaymentItem = ({ item }) => {
    const statusInfo = getStatusColor(item.status);
    const isStudent = user?.role === "student";
    const isTutor = user?.role === "tutor";
    const isAdmin = user?.role === "admin";

    return (
      <View style={[styles.card, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.subjectInfo}>
            <Text style={[styles.subjectText, { color: COLORS.textPrimary }]}>{item.session?.subject || "Subject"}</Text>
            <Text style={[styles.dateText, { color: COLORS.textSecondary }]}>
              {item.session?.sessionDate ? new Date(item.session.sessionDate).toLocaleDateString() : ""} at {item.session?.sessionTime}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.text }]}>{item.status?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: COLORS.border }]} />

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
            <Text style={[styles.detailLabel, { color: COLORS.textSecondary }]}>
              {isStudent ? "Tutor: " : isTutor ? "Student: " : "Parties: "}
            </Text>
            <Text style={[styles.detailValue, { color: COLORS.textPrimary }]}>
              {isStudent ? item.session?.tutorName : isTutor ? item.session?.studentName : `${item.session?.studentName} ↔ ${item.session?.tutorName}`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={14} color={COLORS.textSecondary} />
            <Text style={[styles.detailLabel, { color: COLORS.textSecondary }]}>Amount: </Text>
            <Text style={[styles.amountText, { color: COLORS.primary }]}>LKR {item.amount?.toLocaleString()}</Text>
          </View>
        </View>

        {isAdmin && (
            <View style={{marginTop: 8, padding: 8, backgroundColor: COLORS.inputBackground, borderRadius: 8}}>
                 <Text style={{fontSize: 10, color: COLORS.textSecondary}}>Payment ID: {item.id}</Text>
            </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]}>Payment History</Text>
        <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
          {user?.role === "admin" ? "All system transactions" : "Your recent transactions"}
        </Text>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={renderPaymentItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPayments(true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textSecondary} />
            <Text style={[styles.emptyText, { color: COLORS.textPrimary }]}>No payments found</Text>
            <Text style={[styles.emptySubtext, { color: COLORS.textSecondary }]}>
              Transactions will appear here once sessions are paid.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  subjectInfo: {
    flex: 1,
    paddingRight: 10,
  },
  subjectText: {
    fontSize: 18,
    fontWeight: "800",
  },
  dateText: {
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardBody: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  amountText: {
    fontSize: 15,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
});
