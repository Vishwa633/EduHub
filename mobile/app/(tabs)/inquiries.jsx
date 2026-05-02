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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";

export default function InquiriesPage() {
  const router = useRouter();
  const COLORS = useColors();
  const { token, user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("other");

  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const categories = [
    { label: "Payment Issue", value: "payment" },
    { label: "Session Problem", value: "session" },
    { label: "Technical Support", value: "technical" },
    { label: "Other", value: "other" },
  ];

  const loadInquiries = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`${API_URL}/inquiries/my`, {
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
    loadInquiries();
  }, [loadInquiries]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Required", "Please fill in all fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/inquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category, subject, message }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data?.message || "Failed to submit inquiry");

      Alert.alert("Success", "Your inquiry has been submitted. Admins will review it soon.");
      setSubject("");
      setMessage("");
      setCategory("other");
      setShowForm(false);
      loadInquiries(true);
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to submit inquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/inquiries/${selectedInquiry._id}/reply`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      
      if (!response.ok) throw new Error("Failed to send reply");

      setReplyMessage("");
      setSelectedInquiry(null);
      loadInquiries(true);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
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
              loadInquiries(true);
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
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingTop: 10,
    },
    cardDate: {
      color: COLORS.textSecondary,
      fontSize: 12,
    },
    cardCategory: {
      color: COLORS.primary,
      fontSize: 12,
      fontWeight: "700",
    },
    replySection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    replyBubble: {
      padding: 10,
      backgroundColor: COLORS.inputBackground,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    replyBubbleAdmin: {
      backgroundColor: `${COLORS.primary}08`,
      borderColor: `${COLORS.primary}20`,
    },
    replyTitle: {
      color: COLORS.textPrimary,
      fontWeight: "900",
      fontSize: 11,
      marginBottom: 2,
      textTransform: "uppercase",
    },
    replyText: {
      color: COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    replyButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignSelf: "flex-start",
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    replyButtonText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 12,
    },
    fab: {
      position: "absolute",
      right: 20,
      bottom: 30,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    form: {
      padding: 20,
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    formTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: COLORS.textPrimary,
      marginBottom: 20,
    },
    inputLabel: {
      color: COLORS.textSecondary,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 6,
    },
    input: {
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      padding: 12,
      color: COLORS.textPrimary,
      fontSize: 15,
      marginBottom: 16,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: "top",
    },
    catGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 20,
    },
    catPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.inputBackground,
    },
    catPillActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    catPillText: {
      fontSize: 12,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    catPillTextActive: {
      color: "#fff",
    },
    submitButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 14,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    submitButtonText: {
      color: "#fff",
      fontWeight: "900",
      fontSize: 16,
    },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 60,
    },
    emptyText: {
      color: COLORS.textSecondary,
      marginTop: 10,
      textAlign: "center",
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
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardSubject}>{item.subject}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
              <Text style={styles.cardCategory}>{item.category.toUpperCase()}</Text>
              <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg, marginLeft: 0 }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            </View>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textSecondary} style={{ marginTop: 6 }} />
          </View>
        </View>
        
        {isExpanded && (
          <View style={{ marginTop: 14 }}>
            <Text style={[styles.inputLabel, { marginBottom: 4 }]}>Initial Message:</Text>
            <Text style={styles.cardMessage}>{item.message}</Text>
            
            {item.replies && item.replies.length > 0 && (
              <View style={styles.replySection}>
                {item.replies.map((reply, index) => (
                  <View key={index} style={[styles.replyBubble, reply.senderRole === "admin" && styles.replyBubbleAdmin]}>
                    <Text style={[styles.replyTitle, { color: reply.senderRole === "admin" ? COLORS.primary : COLORS.textSecondary }]}>
                      {reply.senderRole === "admin" ? "ADMIN" : "YOU"}
                    </Text>
                    <Text style={styles.replyText}>{reply.message}</Text>
                  </View>
                ))}
              </View>
            )}

            {status === "open" && (
              <TouchableOpacity 
                style={styles.replyButton} 
                onPress={() => setSelectedInquiry(item)}
              >
                <Ionicons name="chatbubble-outline" size={14} color="#fff" />
                <Text style={styles.replyButtonText}>Send Reply</Text>
              </TouchableOpacity>
            )}

            {status === "resolved" && (
              <TouchableOpacity 
                style={[styles.replyButton, { backgroundColor: "#dc2626" }]} 
                onPress={() => handleDelete(item._id)}
              >
                <Ionicons name="trash-outline" size={14} color="#fff" />
                <Text style={styles.replyButtonText}>Delete Inquiry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
      </View>

      <FlatList
        data={inquiries}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadInquiries(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="help-circle-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No inquiries found. Need help?{"\n"}Click the + button below to contact us.</Text>
          </View>
        }
      />

      {showForm && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowForm(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.form}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={styles.formTitle}>New Inquiry</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.catGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity 
                    key={cat.value} 
                    style={[styles.catPill, category === cat.value && styles.catPillActive]} 
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text style={[styles.catPillText, category === cat.value && styles.catPillTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief summary of your issue"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your problem in detail..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={5}
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Inquiry</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {!showForm && !selectedInquiry && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {selectedInquiry && (
        <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedInquiry(null)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={styles.modalTitle}>Reply to Admin</Text>
                <TouchableOpacity onPress={() => setSelectedInquiry(null)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.replyInput}
                value={replyMessage}
                onChangeText={setReplyMessage}
                placeholder="Type your reply here..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleReply} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.replyButtonText}>Send Reply</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}
