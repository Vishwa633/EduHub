import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Platform, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";

const getStatusColor = (status, colors) => {
  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus === "pending") return colors.warning || "#f59e0b";
  if (normalizedStatus === "refunded") return "#ef4444";
  if (normalizedStatus === "released") return "#10b981";
  if (normalizedStatus === "disputed") return "#f59e0b";
  return colors.textSecondary;
};

const getStatusLabel = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "pending") return "Pending";
  if (normalized === "refunded") return "Refunded";
  if (normalized === "released") return "Released to Tutor";
  if (normalized === "disputed") return "In Review";
  return "Unknown";
};

export default function DisputesPage() {
  const router = useRouter();
  const COLORS = useColors();
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disputes, setDisputes] = useState([]);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadDisputes = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load disputes");
      }

      // Filter only disputed/refunded/released payments
      const disputedPayments = Array.isArray(data) 
        ? data.filter(p => ["disputed", "refunded", "released"].includes(String(p.status || "").toLowerCase()))
        : [];
      
      setDisputes(disputedPayments);
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to load disputes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadDisputes(false);
  }, [loadDisputes]);

  const handleWithdraw = useCallback((bookingId) => {
    const doWithdraw = async () => {
      try {
        const response = await fetch(`${API_URL}/payments/${bookingId}/withdraw-report`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || "Failed to withdraw report");
        }
        if (Platform.OS === 'web') {
          window.alert("Report has been withdrawn.");
        } else {
          Alert.alert("Success", "Report has been withdrawn.");
        }
        loadDisputes(true);
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert(error.message || "Unable to withdraw report");
        } else {
          Alert.alert("Error", error.message || "Unable to withdraw report");
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to withdraw this dispute? The payment will be returned to the pending/held state.");
      if (confirmed) {
        doWithdraw();
      }
      return;
    }

    Alert.alert(
      "Withdraw Report",
      "Are you sure you want to withdraw this dispute? The payment will be returned to the pending/held state.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: doWithdraw,
        },
      ]
    );
  }, [token, loadDisputes]);

  const handleEditSubmit = async () => {
    if (!editReason.trim()) {
      if (Platform.OS === 'web') window.alert("Please provide a reason");
      else Alert.alert("Error", "Please provide a reason");
      return;
    }
    try {
      setIsEditing(true);
      const response = await fetch(`${API_URL}/payments/${editingBookingId}/edit-report`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: editReason }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to edit report");
      }
      if (Platform.OS === 'web') {
        window.alert("Report updated successfully");
      } else {
        Alert.alert("Success", "Report updated successfully");
      }
      setEditModalVisible(false);
      loadDisputes(true);
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(error.message);
      } else {
        Alert.alert("Error", error.message);
      }
    } finally {
      setIsEditing(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
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
      marginBottom: 16,
      marginTop: 8,
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
      marginBottom: 8,
      gap: 10,
    },
    label: {
      color: COLORS.textSecondary,
      fontWeight: "600",
      fontSize: 13,
      flex: 1,
    },
    value: {
      color: COLORS.textPrimary,
      fontWeight: "700",
      fontSize: 13,
      flex: 1,
      textAlign: "right",
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: "flex-end",
    },
    statusText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 12,
    },
    tutor: {
      color: COLORS.textPrimary,
      fontWeight: "700",
      fontSize: 14,
    },
    emptyText: {
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: 40,
      fontSize: 14,
    },
    emptyIcon: {
      textAlign: "center",
      marginBottom: 12,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: 20,
      maxWidth: 500,
      width: "100%",
      alignSelf: "center",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: COLORS.textPrimary,
    },
    textInput: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      padding: 12,
      color: COLORS.textPrimary,
      minHeight: 100,
      marginBottom: 16,
      backgroundColor: COLORS.background,
    },
    submitButton: {
      backgroundColor: COLORS.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    submitButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 16,
    },
  }), [COLORS]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark || COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Disputes</Text>
      </View>

      <FlatList
        data={disputes}
        keyExtractor={(item) => String(item.id || item._id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDisputes(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No disputes filed</Text>
            <Text style={[styles.emptyText, { marginTop: 8, fontSize: 12 }]}>Your payment reports will appear here</Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = String(item.status || "").toLowerCase();
          const tutorName = item?.session?.tutor?.tutorProfile?.fullName || item?.session?.tutor?.username || "N/A";
          const subject = item?.session?.subject || "N/A";
          const amount = Number(item?.amount || 0);

          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Tutor</Text>
                <Text style={styles.tutor}>{tutorName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Subject</Text>
                <Text style={styles.value}>{subject}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.value}>LKR {amount.toLocaleString()}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>
                  {item?.session?.sessionDate ? new Date(item.session.sessionDate).toDateString() : "N/A"}
                </Text>
              </View>
              <View style={[styles.row, { marginBottom: 0, marginTop: 6 }]}>
                <Text style={styles.label}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status, COLORS) }]}>
                  <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
                </View>
              </View>
              
              {status === "disputed" && item?.session?._id && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingBookingId(item.session._id);
                      setEditReason(item.session.tutorMessage || "");
                      setEditModalVisible(true);
                    }}
                    style={{
                      flex: 1,
                      borderColor: COLORS.primary,
                      borderWidth: 1,
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: `${COLORS.primary}10`,
                    }}
                  >
                    <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 13 }}>Edit Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleWithdraw(item.session._id)}
                    style={{
                      flex: 1,
                      borderColor: COLORS.border,
                      borderWidth: 1,
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: `${COLORS.textSecondary}10`,
                    }}
                  >
                    <Text style={{ color: COLORS.textSecondary, fontWeight: "700", fontSize: 13 }}>Withdraw Report</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Dispute Reason</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Explain the issue..."
              placeholderTextColor={COLORS.textSecondary}
              value={editReason}
              onChangeText={setEditReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[styles.submitButton, isEditing && { opacity: 0.7 }]} 
              onPress={handleEditSubmit} 
              disabled={isEditing}
            >
              {isEditing ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
