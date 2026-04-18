import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
function UserAvatar({ uri, size = 80, borderRadius }) {
  const r = borderRadius ?? size / 2;
  const isReal = typeof uri === "string" && uri.trim().length > 0 && !uri.includes("dicebear.com");
  return (
    <View style={{ width: size, height: size, borderRadius: r, overflow: "hidden",
      backgroundColor: "#b0b3b8", alignItems: "center", justifyContent: "center" }}>
      {isReal
        ? <Image source={{ uri }} style={{ width: "100%", height: "100%", position: "absolute" }} contentFit="cover" />
        : <Ionicons name="person" size={size * 0.6} color="#ffffff" />}
    </View>
  );
}

export default function UserDetailsPage() {
  const router = useRouter();
  const COLORS = useColors();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState("student");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ totalUsers: 0, currentPage: 1, totalPages: 1 });
  const [busyUserId, setBusyUserId] = useState("");

  const loadUsers = useCallback(async (role = activeTab, isRefresh = false) => {
    try {
      if (String(user?.role || "") !== "admin") {
        setUsers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/tutors/admin/users?role=${role}&page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load users");
      }

      setUsers(Array.isArray(data?.users) ? data.users : []);
      setSummary({
        totalUsers: Number(data?.totalUsers || 0),
        currentPage: Number(data?.currentPage || 1),
        totalPages: Number(data?.totalPages || 1),
      });
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.role, activeTab]);

  const toggleUserStatus = useCallback(async (item) => {
    if (!item?._id || String(user?.role || "") !== "admin") {
      return;
    }

    const nextStatus = !Boolean(item?.isActive);
    try {
      setBusyUserId(String(item._id));
      const response = await fetch(`${API_URL}/tutors/admin/users/${item._id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update user status");
      }

      setUsers((current) => current.map((entry) => (
        String(entry?._id) === String(item._id)
          ? { ...entry, isActive: Boolean(data?.user?.isActive) }
          : entry
      )));
      Alert.alert("Success", data?.message || "User status updated");
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to update user status");
    } finally {
      setBusyUserId("");
    }
  }, [token, user?.role]);

  const filteredUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((item) => {
      const role = String(item?.role || activeTab);
      const searchableValues = [
        item?.username,
        item?.email,
        item?.tutorProfile?.fullName,
        item?.tutorProfile?.subject,
      ];

      return searchableValues.some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [activeTab, searchText, users]);

  useEffect(() => {
    loadUsers(activeTab, false);
  }, [loadUsers, activeTab]);

  const styles = useMemo(() => StyleSheet.create({
    screen: {
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
    titleWrap: {
      flex: 1,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: 24,
      fontWeight: "900",
    },
    subtitle: {
      color: COLORS.textSecondary,
      marginTop: 4,
      fontSize: 13,
    },
    searchWrap: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardBackground,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      color: COLORS.textPrimary,
      paddingVertical: 12,
      fontSize: 14,
      fontWeight: "700",
    },
    clearButton: {
      width: 28,
      height: 28,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.inputBackground,
    },
    tabRow: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.cardBackground,
      padding: 6,
      flexDirection: "row",
      gap: 8,
    },
    tabButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    tabText: {
      fontWeight: "800",
      fontSize: 13,
    },
    statsBar: {
      marginHorizontal: 20,
      marginBottom: 14,
      borderRadius: 16,
      padding: 14,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    statBlock: {
      flex: 1,
    },
    statLabel: {
      color: COLORS.textSecondary,
      fontSize: 12,
      fontWeight: "700",
    },
    statValue: {
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 4,
    },
    card: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 18,
      padding: 16,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    topRow: {
      flexDirection: "row",
      gap: 12,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 14,
      backgroundColor: COLORS.inputBackground,
    },
    name: {
      color: COLORS.textPrimary,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 2,
    },
    email: {
      color: COLORS.textSecondary,
      fontSize: 12,
      marginBottom: 4,
    },
    subject: {
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 2,
    },
    roleChip: {
      alignSelf: "flex-start",
      marginTop: 6,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: COLORS.inputBackground,
    },
    roleChipText: {
      color: COLORS.textSecondary,
      fontWeight: "800",
      fontSize: 11,
    },
    statusChip: {
      alignSelf: "flex-start",
      marginTop: 8,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    statusChipText: {
      fontSize: 11,
      fontWeight: "900",
    },
    cardFooter: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerMeta: {
      color: COLORS.textSecondary,
      fontSize: 11,
      fontWeight: "800",
    },
    openButton: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: COLORS.primary,
    },
    openButtonText: {
      color: COLORS.white,
      fontWeight: "800",
      fontSize: 12,
    },
    statusButton: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
    },
    statusButtonText: {
      fontWeight: "900",
      fontSize: 12,
    },
    empty: {
      alignItems: "center",
      paddingTop: 40,
      paddingHorizontal: 20,
    },
    emptyText: {
      color: COLORS.textSecondary,
      marginTop: 10,
      textAlign: "center",
    },
  }), [COLORS]);

  const renderUser = ({ item }) => {
    const role = String(item?.role || activeTab);
    const isTutor = role === "tutor";
    const isActive = item?.isActive !== false;
    const isBusy = String(busyUserId) === String(item?._id);

    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <UserAvatar uri={item?.profileImage} size={styles.avatar?.width || 72} borderRadius={styles.avatar?.borderRadius || 36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{isTutor ? (item?.tutorProfile?.fullName || item?.username || "Tutor") : (item?.username || "Student")}</Text>
            <Text style={styles.email}>{item?.email || "N/A"}</Text>
            {isTutor ? <Text style={styles.subject}>{item?.tutorProfile?.subject || "N/A"}</Text> : null}
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>Role: {role.charAt(0).toUpperCase() + role.slice(1)}</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: isActive ? `${COLORS.success || COLORS.primary}22` : `${COLORS.error || COLORS.primary}22` }]}>
              <Text style={[styles.statusChipText, { color: isActive ? (COLORS.success || COLORS.primary) : (COLORS.error || COLORS.primary) }]}>
                {isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerMeta}>Joined: {item?.createdAt ? new Date(item.createdAt).toDateString() : "N/A"}</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {isTutor ? (
              <TouchableOpacity
                style={styles.openButton}
                onPress={() =>
                  router.push({
                    pathname: "/(admin)/tutor/[id]",
                    params: { id: String(item?._id || "") },
                  })
                }
              >
                <Text style={styles.openButtonText}>Open Details</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                styles.statusButton,
                {
                  borderColor: isActive ? (COLORS.error || COLORS.primary) : (COLORS.primary || COLORS.textPrimary),
                  backgroundColor: isActive ? `${(COLORS.error || COLORS.primary)}12` : `${(COLORS.primary || COLORS.textPrimary)}12`,
                  opacity: isBusy ? 0.7 : 1,
                },
              ]}
              disabled={isBusy}
              onPress={() => {
                Alert.alert(
                  isActive ? "Deactivate user" : "Activate user",
                  `Are you sure you want to ${isActive ? "deactivate" : "activate"} this ${role}?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: isActive ? "Deactivate" : "Activate", style: "destructive", onPress: () => toggleUserStatus(item) },
                  ],
                );
              }}
            >
              <Text style={[styles.statusButtonText, { color: isActive ? (COLORS.error || COLORS.primary) : (COLORS.primary || COLORS.textPrimary) }]}>
                {isBusy ? "Saving..." : isActive ? "Deactivate" : "Activate"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (String(user?.role || "") !== "admin") {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: COLORS.textSecondary, fontWeight: "800" }}>Admin access required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark || COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>User Details</Text>
          <Text style={styles.subtitle}>Switch tabs to view student and tutor accounts.</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setActiveTab("student")}
          style={[
            styles.tabButton,
            { backgroundColor: activeTab === "student" ? COLORS.primary : "transparent" },
          ]}
        >
          <Text style={[styles.tabText, { color: activeTab === "student" ? COLORS.white : COLORS.textPrimary }]}>Student</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("tutor")}
          style={[
            styles.tabButton,
            { backgroundColor: activeTab === "tutor" ? COLORS.primary : "transparent" },
          ]}
        >
          <Text style={[styles.tabText, { color: activeTab === "tutor" ? COLORS.white : COLORS.textPrimary }]}>Tutor</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search by name, username, email"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchText ? (
          <TouchableOpacity style={styles.clearButton} onPress={() => setSearchText("")}> 
            <Ionicons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Total {activeTab === "student" ? "Students" : "Tutors"}</Text>
          <Text style={styles.statValue}>{summary.totalUsers}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Showing</Text>
          <Text style={styles.statValue}>{filteredUsers.length}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Page</Text>
          <Text style={styles.statValue}>{summary.currentPage}/{summary.totalPages}</Text>
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => String(item?._id || item?.id)}
        renderItem={renderUser}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUsers(activeTab, true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="person-outline" size={42} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              {searchText.trim()
                ? `No ${activeTab} users match "${searchText.trim()}".`
                : `No ${activeTab} users found.`}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
