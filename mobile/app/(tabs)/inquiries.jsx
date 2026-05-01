import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
import SafeScreen from "../../components/SafeScreen";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "payment", label: "Payment" },
  { key: "booking", label: "Booking" },
  { key: "technical", label: "Technical" },
  { key: "other", label: "Other" },
];

export default function InquiriesScreen() {
  const COLORS = useColors();
  const { token, user } = useAuthStore();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newCategory, setNewCategory] = useState("other");
  const [submitting, setSubmitting] = useState(false);

  // Detail / reply state
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const loadInquiries = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const res = await fetch(`${API_URL}/inquiries/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setInquiries(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error loading inquiries:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const handleSubmit = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      Alert.alert("Error", "Subject and message are required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/inquiries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: newCategory,
          subject: newSubject.trim(),
          message: newMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowNewModal(false);
        setNewSubject("");
        setNewMessage("");
        setNewCategory("other");
        loadInquiries();
        Alert.alert("Success", "Inquiry submitted successfully");
      } else {
        Alert.alert("Error", data?.message || "Failed to submit inquiry");
      }
    } catch (error) {
      Alert.alert("Error", "Unable to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedInquiry) return;

    try {
      setReplying(true);
      const res = await fetch(
        `${API_URL}/inquiries/${selectedInquiry._id}/reply`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: replyText.trim() }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setReplyText("");
        setSelectedInquiry(data);
        loadInquiries();
      } else {
        Alert.alert("Error", data?.message || "Failed to send reply");
      }
    } catch (error) {
      Alert.alert("Error", "Unable to send reply");
    } finally {
      setReplying(false);
    }
  };

  const filteredInquiries = useMemo(() => {
    if (selectedCategory === "all") return inquiries;
    return inquiries.filter((i) => i.category === selectedCategory);
  }, [inquiries, selectedCategory]);

  const getStatusColor = (status) => {
    switch (status) {
      case "resolved":
        return "#059669";
      case "open":
        return COLORS.primary;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case "resolved":
        return "#ECFDF5";
      case "open":
        return `${COLORS.primary}15`;
      default:
        return COLORS.inputBackground || "#f1f5f9";
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: COLORS.background },
        header: { paddingHorizontal: 20, paddingVertical: 15 },
        headerRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        headerTitle: {
          fontSize: 28,
          fontWeight: "800",
          color: COLORS.textPrimary,
        },
        newBtn: {
          backgroundColor: COLORS.primary,
          width: 42,
          height: 42,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        filterRow: {
          flexDirection: "row",
          paddingHorizontal: 20,
          gap: 8,
          marginBottom: 12,
        },
        filterChip: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
          borderWidth: 1,
        },
        filterText: { fontSize: 13, fontWeight: "700" },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        },
        emptyText: {
          fontSize: 18,
          fontWeight: "700",
          marginTop: 16,
          color: COLORS.textSecondary,
        },
        emptySubtext: {
          fontSize: 14,
          textAlign: "center",
          marginTop: 8,
          color: COLORS.textSecondary,
        },
        card: {
          marginHorizontal: 20,
          marginBottom: 10,
          padding: 16,
          borderRadius: 16,
          backgroundColor: COLORS.cardBackground,
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        cardHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        },
        cardSubject: {
          fontSize: 16,
          fontWeight: "800",
          color: COLORS.textPrimary,
          flex: 1,
          marginRight: 10,
        },
        statusBadge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 99,
        },
        statusText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
        cardMessage: {
          fontSize: 14,
          color: COLORS.textSecondary,
          lineHeight: 20,
          marginBottom: 8,
        },
        cardFooter: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        cardCategory: {
          fontSize: 12,
          fontWeight: "700",
          color: COLORS.primary,
          textTransform: "capitalize",
        },
        cardDate: {
          fontSize: 11,
          color: COLORS.textSecondary,
        },
        replyCount: {
          fontSize: 12,
          color: COLORS.textSecondary,
          fontWeight: "600",
          marginTop: 6,
        },

        // Modal styles
        modalBackdrop: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        },
        modalSheet: {
          backgroundColor: COLORS.cardBackground,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 20,
          maxHeight: "85%",
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        modalTitle: {
          fontSize: 20,
          fontWeight: "900",
          color: COLORS.textPrimary,
          marginBottom: 16,
        },
        inputLabel: {
          fontSize: 13,
          fontWeight: "700",
          color: COLORS.textSecondary,
          marginBottom: 6,
          marginTop: 12,
        },
        input: {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.inputBackground || COLORS.background,
          color: COLORS.textPrimary,
          padding: 12,
          fontSize: 15,
        },
        textArea: {
          minHeight: 100,
          textAlignVertical: "top",
        },
        categoryRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 4,
        },
        modalActions: {
          flexDirection: "row",
          gap: 10,
          marginTop: 20,
        },
        cancelBtn: {
          flex: 1,
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.inputBackground || COLORS.background,
        },
        cancelText: {
          color: COLORS.textPrimary,
          fontWeight: "800",
          fontSize: 15,
        },
        submitBtn: {
          flex: 1,
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: "center",
          backgroundColor: COLORS.primary,
        },
        submitText: {
          color: COLORS.white,
          fontWeight: "800",
          fontSize: 15,
        },

        // Detail modal
        detailSheet: {
          backgroundColor: COLORS.cardBackground,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 20,
          maxHeight: "90%",
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        detailSubject: {
          fontSize: 18,
          fontWeight: "900",
          color: COLORS.textPrimary,
          marginBottom: 4,
        },
        detailMessage: {
          fontSize: 14,
          color: COLORS.textSecondary,
          lineHeight: 22,
          marginTop: 10,
          marginBottom: 16,
        },
        repliesTitle: {
          fontSize: 14,
          fontWeight: "800",
          color: COLORS.textPrimary,
          marginBottom: 10,
        },
        replyItem: {
          padding: 12,
          borderRadius: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        replySender: {
          fontSize: 12,
          fontWeight: "800",
          marginBottom: 4,
          textTransform: "capitalize",
        },
        replyMessage: {
          fontSize: 14,
          color: COLORS.textPrimary,
          lineHeight: 20,
        },
        replyDate: {
          fontSize: 10,
          color: COLORS.textSecondary,
          marginTop: 4,
        },
        replyInputRow: {
          flexDirection: "row",
          gap: 10,
          marginTop: 12,
          alignItems: "center",
        },
        replyInput: {
          flex: 1,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.inputBackground || COLORS.background,
          color: COLORS.textPrimary,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 14,
        },
        replyBtn: {
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.primary,
        },
      }),
    [COLORS]
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => {
        setSelectedInquiry(item);
        setReplyText("");
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardSubject} numberOfLines={1}>
          {item.subject}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusBg(item.status) },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status || "open"}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMessage} numberOfLines={2}>
        {item.message}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardCategory}>{item.category || "other"}</Text>
        <Text style={styles.cardDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {item.replies?.length > 0 && (
        <Text style={styles.replyCount}>
          {item.replies.length} {item.replies.length === 1 ? "reply" : "replies"}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeScreen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Help & Support</Text>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => setShowNewModal(true)}
            >
              <Ionicons name="add" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.filterRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? COLORS.primary
                      : COLORS.cardBackground,
                    borderColor: active ? COLORS.primary : COLORS.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? COLORS.white : COLORS.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredInquiries.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="help-buoy-outline"
              size={64}
              color={COLORS.border}
            />
            <Text style={styles.emptyText}>No inquiries yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to submit a new inquiry
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredInquiries}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadInquiries(true)}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          />
        )}

        {/* New Inquiry Modal */}
        <Modal
          visible={showNewModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowNewModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>New Inquiry</Text>

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.filter((c) => c.key !== "all").map((cat) => {
                  const active = newCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active
                            ? COLORS.primary
                            : COLORS.cardBackground,
                          borderColor: active ? COLORS.primary : COLORS.border,
                        },
                      ]}
                      onPress={() => setNewCategory(cat.key)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          {
                            color: active
                              ? COLORS.white
                              : COLORS.textSecondary,
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief subject of your inquiry"
                placeholderTextColor={COLORS.textSecondary}
                value={newSubject}
                onChangeText={setNewSubject}
              />

              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={COLORS.textSecondary}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowNewModal(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { opacity: submitting ? 0.7 : 1 },
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.submitText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Detail / Reply Modal */}
        <Modal
          visible={Boolean(selectedInquiry)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedInquiry(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.detailSheet}>
              <TouchableOpacity
                onPress={() => setSelectedInquiry(null)}
                style={{ alignSelf: "flex-end", marginBottom: 8 }}
              >
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={styles.detailSubject}>
                  {selectedInquiry?.subject}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusBg(selectedInquiry?.status) },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(selectedInquiry?.status) },
                    ]}
                  >
                    {selectedInquiry?.status || "open"}
                  </Text>
                </View>
              </View>

              <Text style={styles.detailMessage}>
                {selectedInquiry?.message}
              </Text>

              {selectedInquiry?.replies?.length > 0 && (
                <>
                  <Text style={styles.repliesTitle}>Replies</Text>
                  <FlatList
                    data={selectedInquiry.replies}
                    keyExtractor={(item, index) => item._id || String(index)}
                    style={{ maxHeight: 250 }}
                    renderItem={({ item }) => (
                      <View
                        style={[
                          styles.replyItem,
                          {
                            backgroundColor:
                              item.senderRole === "admin"
                                ? `${COLORS.primary}10`
                                : COLORS.inputBackground || COLORS.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.replySender,
                            {
                              color:
                                item.senderRole === "admin"
                                  ? COLORS.primary
                                  : COLORS.textSecondary,
                            },
                          ]}
                        >
                          {item.senderRole === "admin" ? "Admin" : "You"}
                        </Text>
                        <Text style={styles.replyMessage}>{item.message}</Text>
                        <Text style={styles.replyDate}>
                          {new Date(item.createdAt).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  />
                </>
              )}

              {selectedInquiry?.status !== "resolved" && (
                <View style={styles.replyInputRow}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Write a reply..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={replyText}
                    onChangeText={setReplyText}
                  />
                  <TouchableOpacity
                    style={[
                      styles.replyBtn,
                      { opacity: replying || !replyText.trim() ? 0.6 : 1 },
                    ]}
                    onPress={handleReply}
                    disabled={replying || !replyText.trim()}
                  >
                    {replying ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Ionicons name="send" size={18} color={COLORS.white} />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeScreen>
  );
}
