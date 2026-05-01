import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";

export default function AdminInquiries() {
  const router = useRouter();
  const { token } = useAuthStore();
  const COLORS = useColors();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInquiries = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`${API_URL}/inquiries/admin/all`, {
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

  const renderInquiryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}
      onPress={() => router.push(`/inquiry/${item._id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
           <View style={[styles.avatar, { backgroundColor: COLORS.primary + '10' }]}>
             <Text style={[styles.avatarText, { color: COLORS.primary }]}>
                {item.studentName?.charAt(0).toUpperCase()}
             </Text>
           </View>
           <View>
             <Text style={[styles.userName, { color: COLORS.textPrimary }]}>{item.studentName}</Text>
             <Text style={[styles.userEmail, { color: COLORS.textSecondary }]}>{item.student?.email}</Text>
           </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === "resolved" ? "#dcfce7" : "#fff7ed" }]}>
          <Text style={[styles.statusText, { color: item.status === "resolved" ? "#166534" : "#9a3412" }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardContent}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        </View>
        <Text style={[styles.subjectText, { color: COLORS.textPrimary }]}>{item.subject}</Text>
        <Text style={[styles.messagePreview, { color: COLORS.textSecondary }]} numberOfLines={2}>
          {item.message}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.dateText, { color: COLORS.textSecondary }]}>
          {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={styles.replyInfo}>
           <Ionicons name="chatbubbles-outline" size={14} color={item.replies.length > 0 ? COLORS.primary : COLORS.textSecondary} />
           <Text style={[styles.replyText, { color: item.replies.length > 0 ? COLORS.primary : COLORS.textSecondary }]}>
              {item.replies.length} replies
           </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]}>Student Inquiries</Text>
        <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
          Review and respond to platform inquiries
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
            <Ionicons name="mail-open-outline" size={64} color={COLORS.textSecondary} />
            <Text style={[styles.emptyText, { color: COLORS.textPrimary }]}>No active inquiries</Text>
            <Text style={[styles.emptySubtext, { color: COLORS.textSecondary }]}>
              All student inquiries have been cleared. Good job!
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
    alignItems: "center",
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 16,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 11,
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
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  cardContent: {
    gap: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
  },
  subjectText: {
    fontSize: 16,
    fontWeight: "800",
  },
  messagePreview: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  dateText: {
    fontSize: 11,
  },
  replyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  replyText: {
    fontSize: 12,
    fontWeight: "700",
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
  },
});
