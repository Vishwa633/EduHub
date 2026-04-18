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
  const { token, user } = useAuthStore();
  const COLORS = useColors();
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const menuTranslateX = useRef(new Animated.Value(-280)).current;
  const isPendingTutor = user?.role === "tutor" && user?.approvalStatus === "pending";
  const isTutor = user?.role === "tutor";
  const isStudent = user?.role === "student";

  const normalizeSubject = (value) => String(value || "").trim();

  const loadSubjects = useCallback(async () => {
    try {
      setLoading(true);

      if (!token) {
        setSubjects([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/tutors/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch subjects");

      const safeSubjects = Array.isArray(data?.subjects) ? data.subjects : [];
      setSubjects(safeSubjects);
    } catch (error) {
      console.error("❌ Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [token]);



  const handleSubjectSelect = (subject) => {
    const encodedName = encodeURIComponent(subject);
    router.push(`/(tabs)/subject/${encodedName}`);
  };

  const normalizedQuery = subjectQuery.trim().toLowerCase();
  const filteredSubjects = normalizedQuery
    ? subjects.filter((subject) => normalizeSubject(subject).toLowerCase().includes(normalizedQuery))
    : subjects;

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

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
      toValue: -280,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setIsSideMenuOpen(false));
  }, [menuTranslateX]);

  const openFavourites = useCallback(() => {
    closeSideMenu();
    router.push("/(tabs)/favourites");
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
              width: 270,
              height: "100%",
              backgroundColor: COLORS.cardBackground,
              borderRightWidth: 1,
              borderRightColor: COLORS.border,
              paddingTop: 46,
              paddingHorizontal: 14,
              transform: [{ translateX: menuTranslateX }],
            }}
          >
            <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: "900", marginBottom: 16 }}>
              Quick Menu
            </Text>

            <TouchableOpacity
              onPress={openFavourites}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.inputBackground,
                paddingVertical: 12,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ionicons name="heart-outline" size={20} color={COLORS.primary} />
              <Text style={{ color: COLORS.textPrimary, fontWeight: "800", fontSize: 14 }}>Favourites</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      <FlatList
        data={filteredSubjects}
        keyExtractor={(item) => item}
        numColumns={1}
        contentContainerStyle={{ paddingTop: isTutor || isStudent ? 24 : 72, paddingBottom: 24, paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          const titleColor = COLORS.primary;
          const bodyColor = COLORS.textSecondary;
          const metaColor = COLORS.textSecondary;

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
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 14,
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
            <View style={{ borderRadius: 28, padding: 18, marginBottom: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#e6edf5', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 }}>
              <Text style={{ fontSize: 36, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 0.2, lineHeight: 40 }}>
                Subjects
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 }}>
                Pick a subject and jump straight into the tutors who teach it.
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBackground, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border }}>
                  <Ionicons name="grid-outline" size={14} color={COLORS.primary} />
                  <Text style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>
                    {filteredSubjects.length} subjects
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
                placeholder="Search subjects..."
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
              No subjects found
            </Text>
            <Text style={{ marginTop: 4, color: COLORS.textSecondary, textAlign: "center" }}>
              Try another keyword to find the subject you need.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSubjects()}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />

    </View>
  );
}