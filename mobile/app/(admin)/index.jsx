import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import AdminSidebar from "../components/AdminSidebar";

const statusLabel = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "accepted") return "Accepted";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "funds_held") return "Funds Held";
  if (normalized === "completed_by_tutor") return "Completed";
  if (normalized === "released") return "Released";
  if (normalized === "disputed") return "Disputed";
  if (normalized === "refunded") return "Refunded";
  return "Pending";
};

const formatCurrency = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

export default function AdminHome() {
  const router = useRouter();
  const COLORS = useColors();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingTutorCount, setPendingTutorCount] = useState(0);
  const [latestPendingName, setLatestPendingName] = useState("");
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [stats, setStats] = useState({ tutors: 0, students: 0, activeSessions: 0, openInquiries: 0, revenue: 0 });
  const [waveAnim] = useState(new Animated.Value(0));

  const styles = useMemo(() => StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      padding: 16,
      paddingBottom: 28,
    },
    headerContainer: {
      paddingHorizontal: 0,
      paddingVertical: 16,
      paddingBottom: 14,
      backgroundColor: COLORS.background,
      zIndex: 50,
      elevation: 10,
    },
    topbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      gap: 12,
      paddingHorizontal: 16,
      zIndex: 60,
    },
    topbarLeft: {
      flex: 1,
    },
    menuButton: {
      width: 60,
      height: 60,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.cardBackground,
      borderWidth: 2,
      borderColor: COLORS.primary,
      zIndex: 70,
      elevation: 12,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: 24,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: 13,
      marginTop: 4,
      lineHeight: 18,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    iconButton: {
      width: 60,
      height: 60,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.cardBackground,
      borderWidth: 2,
      borderColor: COLORS.primary,
      zIndex: 70,
      elevation: 12,
    },
    hero: {
      borderRadius: 18,
      padding: 16,
      paddingHorizontal: 20,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: 14,
      marginHorizontal: 12,
      shadowColor: COLORS.black,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 1,
    },
    heroTitle: {
      color: COLORS.textPrimary,
      fontSize: 22,
      fontWeight: "900",
      letterSpacing: -0.3,
    },
    heroText: {
      color: COLORS.textSecondary,
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
    },
    heroMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 12,
    },
    metaPill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaPillText: {
      color: COLORS.textPrimary,
      fontSize: 12,
      fontWeight: "800",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 14,
    },
    statCard: {
      flex: 1,
      minWidth: 150,
      borderRadius: 16,
      padding: 14,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    statIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: 10,
    },
    statValue: {
      color: COLORS.textPrimary,
      fontSize: 22,
      fontWeight: "900",
    },
    statLabel: {
      color: COLORS.textSecondary,
      fontSize: 12,
      marginTop: 4,
      fontWeight: "700",
    },
    card: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: 12,
    },
    cardTitle: {
      color: COLORS.textPrimary,
      fontWeight: "900",
      fontSize: 16,
      marginBottom: 6,
    },
    cardText: {
      color: COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    actionButton: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.primary,
      marginTop: 10,
    },
    actionButtonSecondary: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginTop: 10,
    },
    actionText: {
      color: COLORS.white,
      fontWeight: "900",
      fontSize: 13,
    },
    actionTextSecondary: {
      color: COLORS.textPrimary,
      fontWeight: "900",
      fontSize: 13,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    sectionTitle: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: "900",
    },
    sectionSubtitle: {
      color: COLORS.textSecondary,
      fontSize: 12,
      marginTop: 3,
    },
    waveHand: {
      fontSize: 28,
      marginLeft: 8,
    },
    table: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: "hidden",
      backgroundColor: COLORS.cardBackground,
    },
    tableHeader: {
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: COLORS.inputBackground,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    tableHeaderCell: {
      color: COLORS.textSecondary,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    row: {
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      alignItems: "center",
    },
    rowCell: {
      color: COLORS.textPrimary,
      fontSize: 12,
      fontWeight: "700",
    },
    rowMuted: {
      color: COLORS.textSecondary,
      fontWeight: "600",
    },
    statusBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "900",
    },
    tableAction: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: `${COLORS.primary}12`,
      borderWidth: 1,
      borderColor: `${COLORS.primary}22`,
    },
    tableActionText: {
      color: COLORS.primary,
      fontWeight: "900",
      fontSize: 11,
    },
    empty: {
      alignItems: "center",
      padding: 20,
    },
    emptyText: {
      color: COLORS.textSecondary,
      marginTop: 10,
      textAlign: "center",
    },
  }), [COLORS]);

  const loadOverview = useCallback(async (isRefresh = false) => {
    try {
      if (!token || String(user?.role || "") !== "admin") {
        setPendingTutorCount(0);
        setLatestPendingName("");
        setUnreadAlertCount(0);
        setStats({ tutors: 0, students: 0, activeSessions: 0, revenue: 0 });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [pendingResponse, alertsResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/tutors/admin/pending-tutors/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/payments/alerts/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/payments/admin/dashboard-stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [pendingData, alertsData, statsData] = await Promise.all([
        pendingResponse.json(),
        alertsResponse.json(),
        statsResponse.json(),
      ]);

      if (pendingResponse.ok) {
        setPendingTutorCount(Number(pendingData?.pendingCount || 0));
        const latest = Array.isArray(pendingData?.latestPending) ? pendingData.latestPending[0] : null;
        setLatestPendingName(String(latest?.tutorProfile?.fullName || latest?.username || ""));
      }

      if (alertsResponse.ok) {
        const allAlerts = Array.isArray(alertsData) ? alertsData : [];
        setUnreadAlertCount(allAlerts.filter((item) => item?.isRead !== true).length);
      }

      if (statsResponse.ok) {
        setStats({
          tutors: statsData.tutors || 0,
          students: statsData.students || 0,
          activeSessions: statsData.activeSessions || 0,
          openInquiries: statsData.openInquiries || 0,
          revenue: statsData.revenue || 0,
        });
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    loadOverview(false);
  }, [loadOverview]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [waveAnim]);

  useFocusEffect(
    useCallback(() => {
      loadOverview(false);
    }, [loadOverview]),
  );

  const openUserDetails = () => router.push("/(admin)/tutor-details");
  const openSessions = () => router.push("/(admin)/sessions");
  const openPendingTutors = () => router.push("/(admin)/pending-tutors");
  const openNotifications = () => router.push("/(admin)/notifications");
  const openDisputes = () => router.push("/(admin)/admin-disputes");
  const openMessages = () => router.push("/messages");
  const openEduBot = () => router.push("/edubot");

  const onLogout = async () => {
    const performLogout = async () => {
      try {
        await logout();
      } catch (error) {
        console.error("Logout error in AdminHome:", error);
        Alert.alert("Error", "An unexpected error occurred during logout.");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to logout?")) {
        performLogout();
      }
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive",
        onPress: performLogout
      },
    ]);
  };


  const primaryStats = [
    { label: "Total Tutors", value: stats.tutors, icon: "school-outline" },
    { label: "Total Students", value: stats.students, icon: "people-outline" },
    { label: "Active Sessions", value: stats.activeSessions, icon: "pulse-outline" },
    { label: "Open Inquiries", value: stats.openInquiries, icon: "help-circle-outline" },
    { label: "Revenue", value: formatCurrency(stats.revenue), icon: "wallet-outline" },
  ];

  const statusTone = (value) => {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "completed" || normalized === "released") return { bg: "#dcfce7", text: "#166534" };
    if (normalized === "pending") return { bg: "#eef2ff", text: "#1e40af" };
    if (normalized === "cancelled" || normalized === "rejected") return { bg: "#fee2e2", text: "#991b1b" };
    return { bg: COLORS.inputBackground, text: COLORS.textSecondary };
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[0]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOverview(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
    >
      <View style={styles.headerContainer}>
        <View style={styles.topbar}>
          <View style={styles.topbarLeft}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setSidebarOpen(true)} style={styles.menuButton}>
            <Ionicons name="menu-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={openNotifications} style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
            {unreadAlertCount > 0 ? (
              <View style={{ position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 999, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                <Text style={{ color: COLORS.white, fontSize: 8, fontWeight: "900" }}>{unreadAlertCount > 9 ? "9+" : unreadAlertCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={[styles.hero, { marginBottom: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.heroTitle}>Welcome back, Admin</Text>
            <Animated.Text
              style={[
                styles.waveHand,
                {
                  transform: [
                    {
                      rotate: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '30deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              👋
            </Animated.Text>
          </View>
          <Text style={styles.heroText}>
            Manage sessions, tutors, and students from one place.
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.metaPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
              <Text style={styles.metaPillText}>Admin</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="hourglass-outline" size={14} color={COLORS.primary} />
              <Text style={styles.metaPillText}>{pendingTutorCount} Pending Tutors</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {primaryStats.map((item) => (
          <View key={item.label} style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name={item.icon} size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending Tutors</Text>
        <Text style={styles.cardText}>
          {latestPendingName ? `Latest request: ${latestPendingName}` : "No pending tutor request at the moment."}
        </Text>
        <TouchableOpacity style={styles.actionButton} onPress={openPendingTutors}>
          <Text style={styles.actionText}>Open Pending Tutors</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <Text style={styles.cardText}>Open the main admin areas.</Text>
        <TouchableOpacity style={styles.actionButtonSecondary} onPress={openSessions}>
          <Text style={styles.actionTextSecondary}>Sessions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonSecondary} onPress={openUserDetails}>
          <Text style={styles.actionTextSecondary}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => router.push("/(admin)/payments")}>
          <Text style={styles.actionTextSecondary}>Payments</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.actionButtonSecondary} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={16} color={COLORS.textPrimary} />
          <Text style={[styles.actionTextSecondary, { marginLeft: 8 }]}>Logout</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>

    <AdminSidebar
      visible={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      actions={{ openSessions, openUserDetails, openPendingTutors, openNotifications, openPayments: (f) => router.push("/(admin)/payments"), openDisputes, openInquiries: () => router.push("/(admin)/admin-inquiries"), openMessages, openEduBot, onLogout }}
      user={user}
      pendingTutorCount={pendingTutorCount}
      unreadAlertCount={unreadAlertCount}
    />
    </>
  );
}
