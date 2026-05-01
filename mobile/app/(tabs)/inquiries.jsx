import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";

export default function StudentInquiries() {
  const router = useRouter();
  const { token } = useAuthStore();
  const COLORS = useColors();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);

  // New Inquiry Form State
  const [category, setCategory] = useState("academic");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInquiries = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`${API_URL}/inquiries/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch inquiries");

      setInquiries(data);
    } catch (error) {
      console.error("❌ Error fetching inquiries:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      alert("Please fill all fields");
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit inquiry");
      }

      setSubject("");
      setMessage("");
      setModalVisible(false);
      fetchInquiries(true);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInquiryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}
      onPress={() => router.push(`/inquiry/${item._id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === "resolved" ? "#dcfce7" : "#fff7ed" }]}>
          <Text style={[styles.statusText, { color: item.status === "resolved" ? "#166534" : "#9a3412" }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={[styles.subjectText, { color: COLORS.textPrimary }]}>{item.subject}</Text>
      <Text style={[styles.messagePreview, { color: COLORS.textSecondary }]} numberOfLines={2}>
        {item.message}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.dateText, { color: COLORS.textSecondary }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        {item.replies.length > 0 && (
          <View style={styles.replyCount}>
            <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
            <Text style={[styles.replyCountText, { color: COLORS.primary }]}>{item.replies.length} replies</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]}>Help & Inquiries</Text>
        <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
          Track your tickets or create a new one
        </Text>
      </View>

      <FlatList
        data={inquiries}
        keyExtractor={(item) => item._id}
        renderItem={renderInquiryItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchInquiries(true)} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={64} color={COLORS.textSecondary} />
            <Text style={[styles.emptyText, { color: COLORS.textPrimary }]}>No inquiries yet</Text>
            <Text style={[styles.emptySubtext, { color: COLORS.textSecondary }]}>
              Have a question? Click the button below to start a conversation with Admin.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: COLORS.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.textPrimary }]}>New Inquiry</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.textSecondary }]}>Category</Text>
              <View style={styles.categoryPicker}>
                {["academic", "tutor", "other"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      category === cat && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.categoryOptionText, category === cat && { color: COLORS.white }]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.textSecondary }]}>Subject</Text>
              <TextInput
                style={[styles.input, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
                placeholder="Brief summary of your issue"
                placeholderTextColor={COLORS.textSecondary}
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.textSecondary }]}>Message</Text>
              <TextInput
                style={[styles.textArea, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={6}
                value={message}
                onChangeText={setMessage}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: COLORS.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>{isSubmitting ? "Submitting..." : "Submit Ticket"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100,
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
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  subjectText: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
  },
  replyCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  replyCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    boxShadow: "0px 4px 12px rgba(37, 99, 235, 0.4)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: "row",
    gap: 10,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
    minHeight: 120,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
