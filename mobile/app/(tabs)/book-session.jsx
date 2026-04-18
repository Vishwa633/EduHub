import { useMemo, useRef, useState, useEffect } from "react";
import {
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { API_URL } from "../../constants/api";
import { useColors } from "../../hooks/useColors";
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

const CALENDAR_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const toSafeTutor = (rawTutorData) => {
  try {
    if (!rawTutorData) return null;
    return JSON.parse(decodeURIComponent(String(rawTutorData)));
  } catch {
    return null;
  }
};

const weekdayToName = (date) =>
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];

const normalizeDayName = (value) => String(value || "").trim().toLowerCase();

const parseTimeToMinutes = (timeLabel) => {
  const match = String(timeLabel || "").trim().match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
  if (!match) return Number.NaN;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (hour === 12) {
    hour = period === "AM" ? 0 : 12;
  } else if (period === "PM") {
    hour += 12;
  }

  return hour * 60 + minute;
};

const minutesToLabel = (minutes) => {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const displayHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
};

const getMonthLabel = (date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const getCalendarGrid = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) {
    cells.push(null);
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, month, d));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const isSameDate = (a, b) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getTutorRanges = (tutor, date) => {
  const selectedDay = weekdayToName(date);
  const normalizedSelectedDay = normalizeDayName(selectedDay);
  const availability = Array.isArray(tutor?.tutorProfile?.availability)
    ? tutor.tutorProfile.availability
    : [];

  const matched = availability
    .filter((slot) => {
      if (!slot) return false;
      if (slot.isAvailable === false) return false;
      return normalizeDayName(slot.day) === normalizedSelectedDay;
    })
    .map((slot) => ({
      from: String(slot.from || "").trim(),
      to: String(slot.to || "").trim(),
    }));

  return matched;
};

const buildTwoHourSessionSlots = (ranges = []) => {
  const slotSet = new Set();

  ranges.forEach((range) => {
    const from = parseTimeToMinutes(range.from);
    const to = parseTimeToMinutes(range.to);

    if (Number.isNaN(from) || Number.isNaN(to) || from >= to) {
      return;
    }

    // Start times move in 1-hour increments; each session lasts 2 hours.
    for (let start = from; start + 120 <= to; start += 60) {
      const end = start + 120;
      const label = `${minutesToLabel(start)} - ${minutesToLabel(end)}`;
      slotSet.add(label);
    }
  });

  return Array.from(slotSet).sort((a, b) => {
    const startA = parseTimeToMinutes(String(a).split(" - ")[0]);
    const startB = parseTimeToMinutes(String(b).split(" - ")[0]);
    return startA - startB;
  });
};

const createBookingStyles = (themeColors) => {
  const palette = {
    page: themeColors.background,
    card: themeColors.cardBackground,
    cardTint: themeColors.inputBackground,
    primary: themeColors.primary,
    primaryDark: themeColors.textDark || themeColors.primary,
    text: themeColors.textPrimary,
    subText: themeColors.textSecondary,
    border: themeColors.border,
    muted: themeColors.placeholderText,
    danger: "#B42318",
    white: themeColors.white,
    shadow: themeColors.textDark || themeColors.primary,
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.page,
    },
    content: {
      padding: 16,
      paddingBottom: 28,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: palette.white,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: palette.text,
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 14,
      marginBottom: 12,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: palette.text,
      marginBottom: 10,
    },
    sectionHint: {
      color: palette.subText,
      marginBottom: 10,
      fontSize: 12,
    },
    tutorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    tutorImage: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: palette.cardTint,
      borderWidth: 1,
      borderColor: palette.border,
    },
    tutorName: {
      fontSize: 16,
      fontWeight: "800",
      color: palette.text,
      marginBottom: 2,
    },
    tutorMeta: {
      color: palette.subText,
      fontSize: 13,
      marginBottom: 2,
    },
    tutorPrice: {
      color: palette.primaryDark,
      fontSize: 14,
      fontWeight: "700",
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    monthSwitchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    monthBtn: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.cardTint,
    },
    monthLabel: {
      color: palette.text,
      fontWeight: "700",
      minWidth: 120,
      textAlign: "center",
    },
    calendarRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    calendarDayText: {
      flex: 1,
      textAlign: "center",
      color: palette.subText,
      fontSize: 12,
      fontWeight: "700",
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dateCell: {
      width: "14.2857%",
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.cardTint,
      marginBottom: 8,
    },
    dateCellSelected: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    dateCellDisabled: {
      backgroundColor: "#F5F8F6",
      borderColor: "#E7EFEA",
    },
    dateCellText: {
      color: palette.text,
      fontWeight: "700",
    },
    dateCellTextSelected: {
      color: palette.white,
    },
    dateCellTextDisabled: {
      color: "#B4C7BB",
    },
    slotGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    slotBtn: {
      width: "48%",
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardTint,
      alignItems: "center",
    },
    slotBtnSelected: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    slotBtnDisabled: {
      backgroundColor: "#F4F7F5",
      borderColor: "#E5ECE8",
    },
    slotBtnText: {
      color: palette.text,
      fontWeight: "700",
      fontSize: 13,
    },
    slotBtnTextSelected: {
      color: palette.white,
    },
    slotBtnTextDisabled: {
      color: "#A3B8AA",
    },
    notesInput: {
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.cardTint,
      minHeight: 90,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: palette.text,
      fontSize: 14,
    },
    summaryCard: {
      backgroundColor: palette.cardTint,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    summaryLabel: {
      color: palette.subText,
      fontWeight: "600",
    },
    summaryValue: {
      color: palette.text,
      fontWeight: "700",
    },
    summaryPrice: {
      color: palette.primaryDark,
      fontWeight: "800",
    },
    errorText: {
      color: palette.danger,
      marginTop: 8,
      fontSize: 12,
      fontWeight: "600",
    },
    unavailableNote: {
      marginTop: 8,
      color: palette.subText,
      fontSize: 12,
      fontWeight: "600",
    },
    confirmButton: {
      backgroundColor: palette.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    confirmButtonDisabled: {
      opacity: 0.75,
    },
    confirmButtonText: {
      color: palette.white,
      fontSize: 16,
      fontWeight: "800",
    },
  });
};

export default function BookSessionPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token } = useAuthStore();
  const themeColors = useColors();
  const fallbackTutor = toSafeTutor(params?.tutorData);
  const [tutor, setTutor] = useState(fallbackTutor);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTutor, setIsLoadingTutor] = useState(false);

  const summaryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(summaryAnim, {
      toValue: selectedDate && selectedTime ? 1 : 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [selectedDate, selectedTime, summaryAnim]);

  useEffect(() => {
    const tutorId = String(params?.id || fallbackTutor?._id || "").trim();
    if (!tutorId || !token) return;

    const fetchTutorAvailability = async () => {
      try {
        setIsLoadingTutor(true);
        const response = await fetch(`${API_URL}/tutors/${tutorId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) return;

        setTutor(data);
      } catch (error) {
        console.error("Failed to refresh tutor availability:", error);
      } finally {
        setIsLoadingTutor(false);
      }
    };

    fetchTutorAvailability();
  }, [params?.id, fallbackTutor?._id, token]);

  const calendarCells = useMemo(() => getCalendarGrid(calendarMonth), [calendarMonth]);
  const availableRanges = useMemo(() => getTutorRanges(tutor, selectedDate), [tutor, selectedDate]);
  const availableSessionSlots = useMemo(() => buildTwoHourSessionSlots(availableRanges), [availableRanges]);
  const hasTutorRangeForDay = availableRanges.length > 0;
  const styles = useMemo(() => createBookingStyles(themeColors), [themeColors]);

  const tutorName = tutor?.tutorProfile?.fullName || tutor?.username || "Tutor";
  const subject = tutor?.tutorProfile?.subject || "Not specified";
  const profileImage = tutor?.profileImage;
  const price = Number(tutor?.tutorProfile?.price || 0);
  const priceType = "per_session";
  const priceTypeLabel = "per session";

  const handleSelectDate = (date) => {
    if (!date) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDate(date);
    setSelectedTime("");
    setErrors((current) => ({ ...current, selectedDate: "", selectedTime: "" }));
  };

  const handleSelectTime = (slot) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedTime(slot);
    setErrors((current) => ({ ...current, selectedTime: "" }));
  };

  const handleBackPress = () => {
    const returnTo = String(params?.returnTo || "").trim();
    if (returnTo.startsWith("/")) {
      router.replace(returnTo);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    const tutorId = String(tutor?._id || params?.id || "").trim();
    if (tutorId) {
      router.replace({
        pathname: "/(tabs)/tutor/[id]",
        params: { id: tutorId },
      });
      return;
    }

    router.replace("/(tabs)");
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!selectedDate) {
      nextErrors.selectedDate = "Please select a session date";
    }

    if (!selectedTime) {
      nextErrors.selectedTime = "Please choose an available time slot";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleConfirmBooking = async () => {
    if (!validateForm()) {
      Alert.alert("Missing details", "Please complete all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tutorId: String(tutor?._id || params?.id || ""),
          tutorName,
          subject,
          price,
          priceType,
          sessionDate: selectedDate.toISOString(),
          sessionTime: selectedTime,
          sessionMode: "online",
          notes: String(notes || "").trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save booking request");
      }

      const goToSessions = () => router.replace("/(tabs)/create");

      if (Platform.OS === "web") {
        Alert.alert("Success", "Booking request sent. Please wait until the tutor accepts your session request.");
        goToSessions();
      } else {
        Alert.alert("Success", "Booking request sent. Please wait until the tutor accepts your session request.", [
          {
            text: "OK",
            onPress: goToSessions,
          },
        ]);
      }
    } catch (error) {
      console.error("Booking save failed:", error);
      Alert.alert("Error", error.message || "Failed to save booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={20} color={themeColors.textDark || themeColors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Session</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tutor Info</Text>
        <View style={styles.tutorRow}>
          <UserAvatar uri={profileImage} size={72} borderRadius={16} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tutorName}>{tutorName}</Text>
            <Text style={styles.tutorMeta}>{subject}</Text>
            <Text style={styles.tutorPrice}>LKR {price > 0 ? price.toLocaleString() : "N/A"} / {priceTypeLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <View style={styles.monthSwitchRow}>
            <TouchableOpacity
              style={styles.monthBtn}
              onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            >
              <Ionicons name="chevron-back" size={18} color={themeColors.textDark || themeColors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{getMonthLabel(calendarMonth)}</Text>
            <TouchableOpacity
              style={styles.monthBtn}
              onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color={themeColors.textDark || themeColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.calendarRow}>
          {CALENDAR_DAYS.map((day) => (
            <Text key={day} style={styles.calendarDayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarCells.map((cell, index) => {
            if (!cell) {
              return <View key={`empty-${index}`} style={styles.dateCell} />;
            }

            const isPast = cell < new Date(new Date().setHours(0, 0, 0, 0));
            const selected = isSameDate(cell, selectedDate);

            return (
              <TouchableOpacity
                key={cell.toISOString()}
                style={[
                  styles.dateCell,
                  selected && styles.dateCellSelected,
                  isPast && styles.dateCellDisabled,
                ]}
                onPress={() => !isPast && handleSelectDate(cell)}
                disabled={isPast}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dateCellText,
                    selected && styles.dateCellTextSelected,
                    isPast && styles.dateCellTextDisabled,
                  ]}
                >
                  {cell.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.selectedDate ? <Text style={styles.errorText}>{errors.selectedDate}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Select Time</Text>
        <Text style={styles.sectionHint}>2-hour sessions for {weekdayToName(selectedDate)} (based on tutor availability).</Text>

        <View style={styles.slotGrid}>
          {availableSessionSlots.map((slot) => {
            const selected = selectedTime === slot;

            return (
              <TouchableOpacity
                key={slot}
                onPress={() => handleSelectTime(slot)}
                style={[
                  styles.slotBtn,
                  selected && styles.slotBtnSelected,
                ]}
              >
                <Text
                  style={[
                    styles.slotBtnText,
                    selected && styles.slotBtnTextSelected,
                  ]}
                >
                  {slot}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!isLoadingTutor && availableSessionSlots.length === 0 ? (
          <Text style={styles.unavailableNote}>
            {hasTutorRangeForDay
              ? "Tutor has availability on this day, but no full 2-hour session fits in the selected time range."
              : "Tutor is not available on this day. Please choose another date."}
          </Text>
        ) : null}
        {errors.selectedTime ? <Text style={styles.errorText}>{errors.selectedTime}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
          placeholder="Enter any specific topics or requests"
          placeholderTextColor={themeColors.placeholderText}
        />
      </View>

      <Animated.View
        style={[
          styles.card,
          styles.summaryCard,
          {
            opacity: summaryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
            transform: [
              {
                translateY: summaryAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>{selectedDate.toDateString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time</Text>
          <Text style={styles.summaryValue}>{selectedTime || "Not selected"}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Price</Text>
          <Text style={styles.summaryPrice}>LKR {price > 0 ? price.toLocaleString() : "N/A"}</Text>
        </View>
      </Animated.View>

      <TouchableOpacity
        style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
        onPress={handleConfirmBooking}
        disabled={isSubmitting}
        activeOpacity={0.9}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={themeColors.white} />
        ) : (
          <Text style={styles.confirmButtonText}>Confirm Booking</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
