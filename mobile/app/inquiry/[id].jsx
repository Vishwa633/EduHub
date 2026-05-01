import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useCallback, useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";

export default function InquiryDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token, user } = useAuthStore();
  const COLORS = useColors();
  const scrollViewRef = useRef();

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fetchInquiry = useCallback(async () => {
    try {
      // We'll use the specific list to find it if we can't fetch by ID directly, 
      // but let's assume we have an endpoint or just fetch the list and filter.
      // Actually, I'll add a single GET /api/inquiries/:id endpoint to the backend for this.
      const endpoint = user.role === "admin" ? `/inquiries/admin/all` : `/inquiries/my`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error("Failed to load inquiry");
      
      const found = data.find(i => i._id === id);
      if (!found) throw new Error("Inquiry not found");
      
      setInquiry(found);
    } catch (error) {
      console.error("❌ Error fetching inquiry:", error);
      Alert.alert("Error", error.message);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, token, user.role]);

  useEffect(() => {
    fetchInquiry();
  }, [fetchInquiry]);

  const handleSendReply = async () => {
    if (!reply.trim()) return;

    try {
      setIsSending(true);
      const response = await fetch(`${API_URL}/inquiries/${id}/reply`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: reply }),
      });

      if (!response.ok) throw new Error("Failed to send reply");

      setReply("");
      fetchInquiry();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async () => {
    try {
      const response = await fetch(`${API_URL}/inquiries/${id}/resolve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to resolve inquiry");
      fetchInquiry();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  if (loading) return <Loader />;
  if (!inquiry) return null;

  const isAdmin = user.role === "admin";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
           <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]} numberOfLines={1}>{inquiry.subject}</Text>
           <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>Ticket #{inquiry._id.slice(-6).toUpperCase()}</Text>
        </View>
        {isAdmin && inquiry.status !== "resolved" && (
           <TouchableOpacity onPress={handleResolve} style={[styles.resolveButton, { backgroundColor: COLORS.primary + '15' }]}>
             <Text style={[styles.resolveButtonText, { color: COLORS.primary }]}>Resolve</Text>
           </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Original Message */}
        <View style={[styles.originalInquiry, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}>
          <View style={styles.userRow}>
             <View style={[styles.avatar, { backgroundColor: COLORS.primary + '10' }]}>
                <Text style={[styles.avatarText, { color: COLORS.primary }]}>{inquiry.studentName?.charAt(0).toUpperCase()}</Text>
             </View>
             <View>
               <Text style={[styles.userName, { color: COLORS.textPrimary }]}>{inquiry.studentName}</Text>
               <Text style={[styles.dateText, { color: COLORS.textSecondary }]}>
                  {new Date(inquiry.createdAt).toLocaleString()}
               </Text>
             </View>
             <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{inquiry.category.toUpperCase()}</Text>
             </View>
          </View>
          <Text style={[styles.messageText, { color: COLORS.textPrimary }]}>{inquiry.message}</Text>
        </View>

        {/* Replies */}
        {inquiry.replies.map((msg, index) => {
          const isMsgAdmin = msg.senderRole === "admin";
          return (
            <View
              key={index}
              style={[
                styles.messageContainer,
                isMsgAdmin ? styles.adminMessage : styles.studentMessage
              ]}
            >
              <View style={[
                styles.bubble,
                isMsgAdmin 
                  ? { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 } 
                  : { backgroundColor: COLORS.white, borderColor: COLORS.border, borderWidth: 1, borderBottomLeftRadius: 4 }
              ]}>
                <Text style={[styles.senderLabel, { color: isMsgAdmin ? '#fff' : COLORS.textSecondary }]}>
                  {isMsgAdmin ? "Support Agent" : "You"}
                </Text>
                <Text style={[styles.bubbleText, { color: isMsgAdmin ? '#fff' : COLORS.textPrimary }]}>
                  {msg.message}
                </Text>
                <Text style={[styles.bubbleTime, { color: isMsgAdmin ? '#fff' : COLORS.textSecondary }]}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        })}

        {inquiry.status === "resolved" && (
           <View style={styles.resolvedInfo}>
              <Ionicons name="checkmark-circle" size={24} color="#166534" />
              <Text style={styles.resolvedText}>This ticket has been marked as resolved.</Text>
           </View>
        )}
      </ScrollView>

      {inquiry.status !== "resolved" && (
        <View style={[styles.inputContainer, { borderTopColor: COLORS.border, backgroundColor: COLORS.white }]}>
          <TextInput
            style={[styles.input, { backgroundColor: COLORS.inputBackground, color: COLORS.textPrimary }]}
            placeholder="Type your message..."
            placeholderTextColor={COLORS.textSecondary}
            value={reply}
            onChangeText={setReply}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: reply.trim() ? COLORS.primary : COLORS.border }]}
            onPress={handleSendReply}
            disabled={!reply.trim() || isSending}
          >
            <Ionicons name="send" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  resolveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resolveButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  originalInquiry: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 10,
  },
  categoryTag: {
    marginLeft: 'auto',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  adminMessage: {
    justifyContent: 'flex-start',
    paddingRight: 60,
  },
  studentMessage: {
    justifyContent: 'flex-end',
    paddingLeft: 60,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTime: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  resolvedInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
  },
  resolvedText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },
  inputContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
