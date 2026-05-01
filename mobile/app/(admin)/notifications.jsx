import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";

const normalizeLevel = (value) => String(value || "").trim().toLowerCase();

export default function AdminNotificationsPage() {
  const router = useRouter();
  const COLORS = useColors();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const markAlertsAsRead = useCallback(async (items) => {
    const unreadItems = (Array.isArray(items) ? items : []).filter((item) => item?._id && item?.isRead !== true);
    if (!unreadItems.length || !token) {
      return;
    }

    await Promise.allSettled(
      unreadItems.map((item) =>
        fetch(`${API_URL}/payments/alerts/${item._id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    );
  }, [token]);

  const loadAlerts = useCallback(async (showRefreshing = false) => {
    try {
      if (!token || String(user?.role || "") !== "admin") {
        setAlerts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`${API_URL}/payments/alerts/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load admin notifications");
      }

      const safeAlerts = Array.isArray(data) ? data : [];
      setAlerts(
        safeAlerts.map((item) => ({
          ...item,
          isRead: true,
          justSeen: item?.isRead !== true,
        })),
      );
      markAlertsAsRead(safeAlerts);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to load admin notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.role, markAlertsAsRead]);

  useEffect(() => {
    loadAlerts(false);
  }, [loadAlerts]);

  const clearAllAlerts = useCallback(async () => {
    if (!token) {
      return;
    }

    if (!alerts.length) {
      Alert.alert("Nothing to clear", "No admin notifications available to clear.");
      return;
    }

    try {
      setClearingAll(true);
      const response = await fetch(`${API_URL}/payments/alerts/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to clear admin notifications");
      }

      setAlerts([]);
      Alert.alert("Cleared", "All admin notifications were cleared.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to clear admin notifications");
    } finally {
      setClearingAll(false);
    }
  }, [alerts.length, token]);

  const levelStyles = useMemo(() => ({
    info: { bg: COLORS.cardBackground, border: COLORS.border, icon: COLORS.primary },
    warning: { bg: "#fefce8", border: "#fde68a", icon: "#ca8a04" },
    critical: { bg: "#fef2f2", border: "#fecaca", icon: "#dc2626" },
  }), [COLORS]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]} onPress={() => router.replace("/(admin)")}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]}>Admin Notifications</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Alerts and updates inside the admin area</Text>
        </View>
        <TouchableOpacity
          onPress={clearAllAlerts}
          disabled={clearingAll || loading || refreshing || !alerts.length}
          style={{
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 9,
            backgroundColor: COLORS.cardBackground,
            borderWidth: 1,
            borderColor: COLORS.primary,
            opacity: clearingAll || loading || refreshing || !alerts.length ? 0.55 : 1,
          }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "800" }}>{clearingAll ? "Clearing..." : "Clear All"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => String(item?._id || item?.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAlerts(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
            <Ionicons name="notifications-outline" size={36} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textPrimary, fontWeight: "800", marginTop: 12 }}>No admin notifications yet</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 4, textAlign: "center" }}>
              When there are new alerts, they will appear here without leaving the admin navigation.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const level = normalizeLevel(item?.level);
          const levelStyle = levelStyles[level] || levelStyles.info;
          const isJustSeen = item?.justSeen === true;
          const isInquiry = item?.type === "inquiry";

          const handlePress = () => {
            if (isInquiry && item.inquiry) {
              router.push(`/inquiry/${item.inquiry}`);
            }
          };

          return (
            <TouchableOpacity 
              activeOpacity={isInquiry ? 0.7 : 1}
              onPress={handlePress}
              style={[styles.card, { backgroundColor: isJustSeen ? `${COLORS.primary}12` : levelStyle.bg, borderColor: isJustSeen ? COLORS.primary : levelStyle.border }]}
            >
              <Ionicons 
                name={isInquiry ? "chatbubble-ellipses-outline" : "notifications-outline"} 
                size={18} 
                color={isJustSeen ? COLORS.primary : levelStyle.icon} 
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: isJustSeen ? COLORS.primary : COLORS.textPrimary, fontWeight: "800" }}>{item?.title || "Notification"}</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 3, lineHeight: 18 }}>{item?.message || ""}</Text>
              </View>
              {isInquiry && (
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
});
