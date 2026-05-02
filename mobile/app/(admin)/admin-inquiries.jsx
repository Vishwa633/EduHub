import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";

export default function AdminInquiriesPage() {
  const router = useRouter();
  const COLORS = useColors();
  const { token, user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const isAdmin = String(user?.role || "") === "admin";

  const loadAllInquiries = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`${API_URL}/inquiries/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data?.message || "Failed to load inquiries");
      
      setInquiries(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to load inquiries");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadAllInquiries();
  }, [loadAllInquiries]);

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      Alert.alert("Required", "Please enter a reply.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/inquiries/${selectedInquiry._id}/reply`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: replyMessage, status: "open" }),
      });
      
      if (!response.ok) throw new Error("Failed to send reply");

      Alert.alert("Success", "Reply sent to student.");
      setReplyMessage("");
      setSelectedInquiry(null);
      loadAllInquiries(true);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolveInquiry = async (id) => {
    try {
      const response = await fetch(`${API_URL}/inquiries/${id}/resolve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to resolve");
      
      Alert.alert("Resolved", "Inquiry marked as resolved.");
      loadAllInquiries(true);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      "Delete Inquiry",
      "Are you sure you want to delete this inquiry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/inquiries/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!response.ok) throw new Error("Failed to delete");
              loadAllInquiries(true);
            } catch (error) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
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
    title: {
      color: COLORS.textPrimary,
      fontSize: 24,
      fontWeight: "900",
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 16,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    studentName: {
      color: COLORS.primary,
      fontWeight: "900",
      fontSize: 14,
      marginBottom: 2,
    },
    cardSubject: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      marginLeft: 10,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    cardMessage: {
      color: COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 10,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingTop: 12,
    },
    btn: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },
    replyBtn: {
      backgroundColor: COLORS.primary,
    },
    resolveBtn: {
      backgroundColor: "#16a34a",
    },
    btnText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 12,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: COLORS.textPrimary,
      marginBottom: 16,
    },
    replyInput: {
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      padding: 12,
      color: COLORS.textPrimary,
      minHeight: 100,
      textAlignVertical: "top",
      marginBottom: 20,
    },
    sendBtn: {
      backgroundColor: COLORS.primary,
      height: 50,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 60,
    },
  }), [COLORS]);

  const renderItem = ({ item }) => {
    const status = item.status || "open";
    const statusColor = status === "resolved" ? "#16a34a" : "#ca8a04";
    const statusBg = status === "resolved" ? "#dcfce7" : "#fef9c3";
    const isExpanded = expandedId === item._id;
    
    return (
      <TouchableOpacity 
        activeOpacity={0.95} 
        onPress={() => setExpandedId(isExpanded ? null : item._id)}
        style={styles.card}
      >
        <Text style={styles.studentName}>Student: {item.student?.username || item.studentName}</Text>
        <View style={styles.cardHeader}>
          <Text style={styles.cardSubject}>{item.subject}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            </View>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textSecondary} style={{ marginTop: 6 }} />
          </View>
        </View>
        
        {isExpanded && (
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: "800", marginBottom: 4, textTransform: "uppercase" }}>Original Request:</Text>
            <Text style={styles.cardMessage}>{item.message}</Text>
            
            {item.replies && item.replies.length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: "800", marginBottom: 8, textTransform: "uppercase" }}>Conversation History:</Text>
                {item.replies.map((reply, index) => (
                  <View key={index} style={{ 
                    padding: 10, 
                    backgroundColor: reply.senderRole === "admin" ? `${COLORS.primary}08` : COLORS.inputBackground,
                    borderRadius: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: reply.senderRole === "admin" ? `${COLORS.primary}20` : COLORS.border,
                  }}>
                    <Text style={{ 
                      color: reply.senderRole === "admin" ? COLORS.primary : COLORS.textSecondary,
                      fontWeight: "900",
                      fontSize: 11,
                      marginBottom: 2,
                      textTransform: "uppercase"
                    }}>
                      {reply.senderRole === "admin" ? "YOU" : "STUDENT"}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 }}>{reply.message}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.btn, styles.replyBtn]} onPress={() => setSelectedInquiry(item)}>
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>Reply</Text>
              </TouchableOpacity>
              {status !== "resolved" && (
                <TouchableOpacity style={[styles.btn, styles.resolveBtn]} onPress={() => resolveInquiry(item._id)}>
                  <Ionicons name="checkmark-done" size={16} color="#fff" />
                  <Text style={styles.btnText}>Resolve</Text>
                </TouchableOpacity>
              )}
              {status === "resolved" && (
                <TouchableOpacity style={[styles.btn, { backgroundColor: "#dc2626" }]} onPress={() => handleDelete(item._id)}>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.btnText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: COLORS.textSecondary }}>Admin access required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Inquiries</Text>
      </View>

      <FlatList
        data={inquiries}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAllInquiries(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="help-circle-outline" size={48} color={COLORS.border} />
            <Text style={{ color: COLORS.textSecondary, marginTop: 10 }}>No inquiries from students.</Text>
          </View>
        }
      />

      {selectedInquiry && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedInquiry(null)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reply to {selectedInquiry.student?.username || "Student"}</Text>
            <TextInput
              style={styles.replyInput}
              value={replyMessage}
              onChangeText={setReplyMessage}
              placeholder="Type your reply here..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleReply} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reply</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
