import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  Modal,
  Pressable,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { useAuthStore } from "../../store/authStore";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";

import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../hooks/useColors";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const { token, user, logout } = useAuthStore();
  const COLORS = useColors();
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [tutorSessions, setTutorSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [waveAnim] = useState(new Animated.Value(0));
  const [subjectQuery, setSubjectQuery] = useState("");
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const menuTranslateX = useRef(new Animated.Value(-320)).current;
  const isPendingTutor = user?.role === "tutor" && user?.approvalStatus === "pending";
  const isTutor = user?.role === "tutor";
  const isStudent = user?.role === "student";

  const normalizeSubject = (value) => String(value || "").trim();

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      if (!token) {
        setSubjects([]);
        setTutorSessions([]);
        setLoading(false);
        return;
      }

      if (isTutor) {
        const response = await fetch(`${API_URL}/bookings/tutor`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to fetch tutor sessions");

        const safeSessions = Array.isArray(data) ? data : [];
        setTutorSessions(safeSessions);
      } else {
        const response = await fetch(`${API_URL}/tutors/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to fetch subjects");

        const safeSubjects = Array.isArray(data?.subjects) ? data.subjects : [];
        setSubjects(safeSubjects);
      }
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      if (isTutor) setTutorSessions([]);
      else setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [token, isTutor]);

  const handleSubjectSelect = (subject) => {
    const encodedName = encodeURIComponent(subject);
    router.push(`/(tabs)/subject/${encodedName}`);
  };

  const normalizedQuery = subjectQuery.trim().toLowerCase();
  const filteredSubjects = normalizedQuery
    ? subjects.filter((subject) => normalizeSubject(subject).toLowerCase().includes(normalizedQuery))
    : subjects;
    
  const filteredSessions = normalizedQuery
    ? tutorSessions.filter((session) => (session?.studentName || session?.student?.username || "").toLowerCase().includes(normalizedQuery))
    : tutorSessions;

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadUnreadAlerts = useCallback(async () => {
    try {
      if (!token || !["tutor", "student"].includes(String(user?.role || ""))) {
        setUnreadAlertCount(0);
        return;
      }

      const response = await fetch(`${API_URL}/payments/alerts/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        setUnreadAlertCount(0);
        return;
      }

      const alerts = Array.isArray(data) ? data : [];
      setUnreadAlertCount(alerts.filter((item) => item?.isRead !== true).length);
    } catch (_error) {
      setUnreadAlertCount(0);
    }
  }, [token, user?.role]);

  useEffect(() => {
    loadUnreadAlerts();
  }, [loadUnreadAlerts]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(waveAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ])
    ).start();
  }, [waveAnim]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadAlerts();
    }, [loadUnreadAlerts]),
  );

  const openSideMenu = useCallback(() => {
    setIsSideMenuOpen(true);
    Animated.timing(menuTranslateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [menuTranslateX]);

  const closeSideMenu = useCallback(() => {
    Animated.timing(menuTranslateX, {
      toValue: -320,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setIsSideMenuOpen(false));
  }, [menuTranslateX]);

  const openFavourites = useCallback(() => {
    closeSideMenu();
    router.push("/(tabs)/favourites");
  }, [closeSideMenu, router]);

  const openMessages = useCallback(() => {
    closeSideMenu();
    router.push("/(tabs)/messages");
  }, [closeSideMenu, router]);

  const openEduBot = useCallback(() => {
    closeSideMenu();
    router.push("/(tabs)/edubot");
  }, [closeSideMenu, router]);

  const openDisputes = useCallback(() => {
    closeSideMenu();
    router.push("/(tabs)/disputes");
  }, [closeSideMenu, router]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>

      {isPendingTutor ? (
        <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: 14, padding: 14, backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ color: COLORS.textPrimary, fontWeight: "900", fontSize: 15, marginBottom: 4 }}>Tutor account pending approval</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 }}>
            Your tutor profile is under admin review. You can still log in, and you will receive a notification once the account is activated.
          </Text>
        </View>
      ) : null}

      {isTutor || isStudent ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity
            onPress={openSideMenu}
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.cardBackground,
              borderWidth: 2,
              borderColor: COLORS.primary,
            }}
          >
            <Ionicons name="menu-outline" size={25} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: COLORS.textPrimary, fontWeight: '900', fontSize: 22 }}>
                Hi, {user?.username || user?.fullName || 'there'}
              </Text>
              <Animated.Text style={{ marginLeft: 8, fontSize: 28, transform: [{ rotate: waveAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '30deg'] }) }] }}>
                👋
              </Animated.Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(tabs)/notifications",
                params: { messagesOnly: "1" },
              })
            }
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.cardBackground,
              borderWidth: 2,
              borderColor: COLORS.primary,
            }}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
            {unreadAlertCount > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  backgroundColor: COLORS.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 3,
                }}
              >
                <Text style={{ color: COLORS.white, fontSize: 8, fontWeight: "900" }}>
                  {unreadAlertCount > 9 ? "9+" : unreadAlertCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal transparent visible={isSideMenuOpen} animationType="none" onRequestClose={closeSideMenu}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} onPress={closeSideMenu}>
          <Animated.View
            style={{
              width: 320,
              height: "100%",
              backgroundColor: COLORS.cardBackground,
              borderRightWidth: 1,
              borderRightColor: COLORS.border,
              paddingTop: 56,
              paddingHorizontal: 18,
              transform: [{ translateX: menuTranslateX }],
            }}
          >
            <Text style={{ color: COLORS.textPrimary, fontSize: 22, fontWeight: "900", marginBottom: 18 }}>
              Quick Menu
            </Text>

            <TouchableOpacity
              onPress={openFavourites}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.inputBackground,
                paddingVertical: 16,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Ionicons name="heart-outline" size={22} color={COLORS.primary} />
              <Text style={{ color: COLORS.textPrimary, fontWeight: "900", fontSize: 16 }}>Favourites</Text>
            </TouchableOpacity>

            {!isTutor && (
              <TouchableOpacity
                onPress={() => {
                  closeSideMenu();
                  router.push("/(tabs)/materials");
                }}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  backgroundColor: COLORS.inputBackground,
                  paddingVertical: 16,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 12
                }}
              >
                <Ionicons name="library-outline" size={22} color={COLORS.primary} />
                <Text style={{ color: COLORS.textPrimary, fontWeight: "900", fontSize: 16 }}>Learning Materials</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                closeSideMenu();
                router.push("/(tabs)/inquiries");
              }}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.inputBackground,
                paddingVertical: 16,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginTop: 12
              }}
            >
              <Ionicons name="help-circle-outline" size={22} color={COLORS.primary} />
              <Text style={{ color: COLORS.textPrimary, fontWeight: "900", fontSize: 16 }}>Help Center</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                openMessages();
              }}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.inputBackground,
                paddingVertical: 16,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginTop: 12
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.primary} />
              <Text style={{ color: COLORS.textPrimary, fontWeight: "900", fontSize: 16 }}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                openEduBot();
              }}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.inputBackground,
                paddingVertical: 16,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginTop: 12
              }}
            >
              <Ionicons name="bulb-outline" size={22} color={COLORS.primary} />
              <Text style={{ color: COLORS.textPrimary, fontWeight: "900", fontSize: 16 }}>EduBot</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                openDisputes();
              }}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.inputBackground,
                paddingVertical: 16,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginTop: 12
              }}
            >
              <Ionicons name="gavel-outline" size={22} color={COLORS.primary} />
              <Text style={{ color: COLORS.textPrimary, fontWeight: "900", fontSize: 16 }}>Disputes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                closeSideMenu();
                if (Platform.OS === 'web') {
                  if (window.confirm("Are you sure you want to logout?")) {
                    logout();
                  }
                  return;
                }
                Alert.alert("Logout", "Are you sure you want to logout?", [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Logout", 
                    style: "destructive",
                    onPress: () => logout() 
                  },
                ]);
              }}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.inputBackground,
                paddingVertical: 16,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginTop: 12
              }}
            >
              <Ionicons name="log-out-outline" size={22} color="#f97316" />
              <Text style={{ color: "#f97316", fontWeight: "900", fontSize: 16 }}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      <FlatList
        data={isTutor ? filteredSessions : filteredSubjects}
        keyExtractor={(item, index) => isTutor ? (item._id || String(index)) : item}
        numColumns={1}
        contentContainerStyle={{ paddingTop: isTutor || isStudent ? 24 : 72, paddingBottom: 24, paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          const titleColor = COLORS.primary;
          const bodyColor = COLORS.textSecondary;
          const metaColor = COLORS.textSecondary;

          if (isTutor) {
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/messages`)}
                style={{
                  minHeight: 126,
                  borderRadius: 20,
                  padding: 14,
                  marginBottom: 12,
                  marginHorizontal: 8,
                  alignSelf: 'stretch',
                  backgroundColor: COLORS.white,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  boxShadow: '0px 8px 14px rgba(0, 0, 0, 0.08)',
                  elevation: 3,
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 19, fontWeight: '900', color: titleColor }} numberOfLines={2}>
                      {item.studentName || item.student?.username || "Student"}
                    </Text>
                    <Text style={{ fontSize: 12, marginTop: 6, color: bodyColor }}>
                      Subject: {item.subject}
                    </Text>
                    <Text style={{ fontSize: 12, marginTop: 2, color: bodyColor }}>
                      Date: {new Date(item.sessionDate).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border }}>
                    <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                  <View style={{ alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999, backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="chatbubbles-outline" size={14} color={metaColor} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: metaColor }}>
                      Message
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              onPress={() => handleSubjectSelect(item)}
              style={{
                minHeight: 126,
                borderRadius: 20,
                padding: 14,
                marginBottom: 12,
                marginHorizontal: 8,
                alignSelf: 'stretch',
                backgroundColor: COLORS.white,
                borderWidth: 1,
                borderColor: COLORS.border,
                boxShadow: '0px 8px 14px rgba(0, 0, 0, 0.08)',
                elevation: 3,
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >


              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 19, fontWeight: '900', color: titleColor }} numberOfLines={2}>
                    {item}
                  </Text>
                  <Text style={{ fontSize: 12, marginTop: 6, color: bodyColor }}>
                    Tap to view tutors in this subject
                  </Text>
                </View>

                <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border }}>
                  <Ionicons name="book-outline" size={18} color={COLORS.primary} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <View style={{ alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999, backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary }}>
                    Browse tutors
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="people-outline" size={14} color={metaColor} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: metaColor }}>
                    View subject
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 8, paddingTop: 16, paddingBottom: 16 }}>
            <View style={{ borderRadius: 28, padding: 18, marginBottom: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#e6edf5', boxShadow: '0px 8px 14px rgba(0, 0, 0, 0.08)', elevation: 3 }}>
              <Text style={{ fontSize: 36, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 0.2, lineHeight: 40 }}>
                {isTutor ? "Students" : "Subjects"}
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 }}>
                {isTutor ? "Here are the students that booked sessions with you." : "Pick a subject and jump straight into the tutors who teach it."}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBackground, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border }}>
                  <Ionicons name={isTutor ? "people-outline" : "grid-outline"} size={14} color={COLORS.primary} />
                  <Text style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>
                    {isTutor ? `${filteredSessions.length} sessions` : `${filteredSubjects.length} subjects`}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: COLORS.white,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 2,
                marginBottom: 8,
              }}
            >
              <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
              <TextInput
                value={subjectQuery}
                onChangeText={setSubjectQuery}
                placeholder={isTutor ? "Search students..." : "Search subjects..."}
                placeholderTextColor={COLORS.textSecondary}
                underlineColorAndroid="transparent"
                autoCorrect={false}
                spellCheck={false}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  height: 42,
                  marginLeft: 8,
                  color: COLORS.textPrimary,
                  fontSize: 14,
                  fontWeight: "600",
                  textDecorationLine: "none",
                }}
              />
              {subjectQuery ? (
                <TouchableOpacity onPress={() => setSubjectQuery("")} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {!!errorMessage && (
              <View
                style={{
                  marginTop: 4,
                  backgroundColor: '#fff1f3',
                  borderColor: '#f5c2c7',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                }}
              >
                <Text style={{ color: '#b42318', fontWeight: '600' }}>{errorMessage}</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 24, paddingTop: 30, alignItems: "center" }}>
            <Ionicons name="search-outline" size={26} color={COLORS.textSecondary} />
            <Text style={{ marginTop: 10, color: COLORS.textPrimary, fontWeight: "800", fontSize: 16 }}>
              {isTutor ? "No students found" : "No subjects found"}
            </Text>
            <Text style={{ marginTop: 4, color: COLORS.textSecondary, textAlign: "center" }}>
              {isTutor ? "You don't have any booked sessions yet." : "Try another keyword to find the subject you need."}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboardData()}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />

    </View>
  );
}