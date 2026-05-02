import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";

export default function AdminDisputesPage() {
  const router = useRouter();
  const COLORS = useColors();
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingId, setResolvingId] = useState("");
  const [disputes, setDisputes] = useState([]);

  const isAdmin = String(user?.role || "") === "admin";

  const loadDisputes = useCallback(async (isRefresh = false) => {
    try {
      if (!isAdmin) {
        setDisputes([]);
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/payments/admin/disputes/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load disputes");
      }

      setDisputes(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to load disputes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    loadDisputes(false);
  }, [loadDisputes]);

  const resolveDispute = async (paymentId, action) => {
    try {
      setResolvingId(`${paymentId}:${action}`);
      const endpoint = action === "refund" ? "refund" : "release";
      const response = await fetch(`${API_URL}/payments/admin/${paymentId}/${endpoint}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to resolve dispute");
      }

      Alert.alert("Success", action === "refund" ? "Student refunded successfully." : "Payment released to tutor.");
      loadDisputes(true);
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to resolve dispute");
    } finally {
      setResolvingId("");
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      padding: 16,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.background,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      color: COLORS.textPrimary,
      fontSize: 24,
      fontWeight: "800",
    },
    card: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 16,
      backgroundColor: COLORS.cardBackground,
      padding: 14,
      marginBottom: 12,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
      gap: 10,
    },
    label: {
      color: COLORS.textSecondary,
      fontWeight: "700",
      flex: 1,
    },
    value: {
      color: COLORS.textPrimary,
      fontWeight: "700",
      flex: 1,
      textAlign: "right",
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    button: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    refundButton: {
      backgroundColor: "#dc2626",
    },
    releaseButton: {
      backgroundColor: "#16a34a",
    },
    buttonText: {
      color: COLORS.white,
      fontWeight: "800",
    },
    logWrap: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingTop: 10,
    },
    logText: {
      color: COLORS.textSecondary,
      fontSize: 12,
      marginBottom: 4,
    },
    emptyText: {
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: 30,
    },
  }), [COLORS]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: COLORS.textSecondary, fontWeight: "700" }}>Admin access required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark || COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Center</Text>
      </View>

      <FlatList
        data={disputes}
        keyExtractor={(item) => String(item.id || item._id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDisputes(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No disputes waiting for review.</Text>}
        renderItem={({ item }) => {
          const paymentId = String(item.id || item._id || "");
          const tutorName = item?.session?.tutor?.tutorProfile?.fullName || item?.session?.tutor?.username || "N/A";
          const studentName = item?.session?.student?.username || "N/A";

          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Tutor</Text>
                <Text style={styles.value}>{tutorName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Student</Text>
                <Text style={styles.value}>{studentName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Subject</Text>
                <Text style={styles.value}>{item?.session?.subject || "N/A"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.value}>LKR {Number(item?.amount || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Session</Text>
                <Text style={styles.value}>{item?.session?.sessionDate ? new Date(item.session.sessionDate).toDateString() : "N/A"}</Text>
              </View>

              <View style={styles.logWrap}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: "800", marginBottom: 4 }}>Action Logs</Text>
                {(item?.actionLogs || []).slice(0, 4).map((log) => (
                  <Text key={String(log._id)} style={styles.logText}>
                    {new Date(log.createdAt).toLocaleString()} - {String(log.action || "").replace(/_/g, " ")}
                  </Text>
                ))}
                {!item?.actionLogs?.length ? <Text style={styles.logText}>No logs available.</Text> : null}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.button, styles.refundButton]}
                  onPress={() => resolveDispute(paymentId, "refund")}
                  disabled={!!resolvingId}
                >
                  {resolvingId === `${paymentId}:refund` ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.buttonText}>Refund Student</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.releaseButton]}
                  onPress={() => resolveDispute(paymentId, "release")}
                  disabled={!!resolvingId}
                >
                  {resolvingId === `${paymentId}:release` ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.buttonText}>Release To Tutor</Text>}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
