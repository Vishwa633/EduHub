import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const STATUS_COLORS = {
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#ca8a04",
};

const ONLY_LETTERS_AND_SPACES = /^[A-Za-z ]+$/;

const validateCardNumber = (value) => String(value || "").replace(/\D/g, "").length === 16;

const validateExpiryDate = (value) => {
  const input = String(value || "").trim();
  if (!/^\d{2}\/\d{2}$/.test(input)) {
    return false;
  }

  const [monthText, yearText] = input.split("/");
  const month = Number.parseInt(monthText, 10);
  const year = Number.parseInt(yearText, 10);
  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
    return false;
  }

  const now = new Date();
  const fullYear = 2000 + year;
  const expiry = new Date(fullYear, month, 0, 23, 59, 59, 999);
  return expiry.getTime() >= now.getTime();
};

const validateCvv = (value) => /^\d{3}$/.test(String(value || ""));

const validateCardholderName = (value) => {
  const safe = String(value || "").trim();
  return !!safe && ONLY_LETTERS_AND_SPACES.test(safe);
};

const buildSessionState = (booking, payment, { isStudent, isTutor }) => {
  const bookingStatus = normalizeStatus(booking?.status);
  const paymentStatus = normalizeStatus(payment?.status);

  if (!payment && ["pending"].includes(bookingStatus)) {
    return {
      badge: "Waiting For Tutor Acceptance",
      badgeType: "warning",
      message: "Your session request was sent. Please wait until the tutor accepts it before making a payment.",
      showPayButton: false,
      showConfirmButtons: false,
      showRating: false,
    };
  }

  if (!payment && ["accepted"].includes(bookingStatus) && isStudent) {
    return {
      badge: "Payment Required",
      badgeType: "warning",
      message: "Secure the session payment first. Money stays protected in escrow until completion.",
      showPayButton: true,
      showConfirmButtons: false,
      showRating: false,
    };
  }

  if (!payment && ["accepted"].includes(bookingStatus) && isTutor) {
    return {
      badge: "Payment Pending",
      badgeType: "warning",
      message: "Session was accepted. Waiting for the student to complete the payment.",
      showPayButton: false,
      showConfirmButtons: false,
      showRating: false,
    };
  }

  if (paymentStatus === "pending" && payment?.tutorConfirmed && !payment?.studentConfirmed) {
    return {
      badge: "Pending Completion",
      badgeType: "warning",
      message: "Session completed. Please confirm your session or report a problem.",
      showPayButton: false,
      showConfirmButtons: true,
      showRating: false,
    };
  }

  if (paymentStatus === "pending") {
    return {
      badge: "Waiting For Tutor",
      badgeType: "warning",
      message: "Funds are held safely. Waiting for tutor to mark session as completed.",
      showPayButton: false,
      showConfirmButtons: false,
      showRating: false,
    };
  }

  if (paymentStatus === "released") {
    return {
      badge: "Payment Released",
      badgeType: "success",
      message: "Session confirmed. Payment was released to the tutor.",
      showPayButton: false,
      showConfirmButtons: false,
      showRating: true,
    };
  }

  if (paymentStatus === "disputed") {
    return {
      badge: "Disputed",
      badgeType: "danger",
      message: "Payment is frozen while admin reviews this dispute.",
      showPayButton: false,
      showConfirmButtons: false,
      showRating: false,
    };
  }

  if (paymentStatus === "refunded") {
    return {
      badge: "Refunded",
      badgeType: "success",
      message: "Admin refunded this payment to the student.",
      showPayButton: false,
      showConfirmButtons: false,
      showRating: false,
    };
  }

  return {
    badge: bookingStatus ? String(bookingStatus).replace(/_/g, " ") : "Unknown",
    badgeType: "warning",
    message: "Track payment protection status for this session here.",
    showPayButton: false,
    showConfirmButtons: false,
    showRating: false,
  };
};

const createStyles = (themeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 24,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: themeColors.background,
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
      backgroundColor: themeColors.cardBackground,
      borderWidth: 1,
      borderColor: themeColors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: themeColors.textPrimary,
    },
    card: {
      backgroundColor: themeColors.cardBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 14,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: themeColors.textPrimary,
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      gap: 12,
    },
    label: {
      color: themeColors.textSecondary,
      fontWeight: "700",
      flex: 1,
    },
    value: {
      color: themeColors.textPrimary,
      fontWeight: "700",
      textAlign: "right",
      flex: 1,
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    statusText: {
      fontWeight: "800",
      fontSize: 12,
    },
    helperText: {
      color: themeColors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 14,
    },
    payButton: {
      backgroundColor: themeColors.primary,
      borderRadius: 14,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    confirmButton: {
      backgroundColor: STATUS_COLORS.success,
      borderRadius: 14,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    disputeButton: {
      backgroundColor: STATUS_COLORS.danger,
      borderRadius: 14,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    payButtonDisabled: {
      backgroundColor: themeColors.border,
      opacity: 0.8,
    },
    payButtonText: {
      color: themeColors.white,
      fontWeight: "800",
      fontSize: 15,
    },
    errorText: {
      color: themeColors.textDark,
      fontWeight: "700",
    },
    warningCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#fde68a",
      backgroundColor: "#fefce8",
      padding: 12,
      marginBottom: 14,
    },
    warningText: {
      color: "#92400e",
      fontWeight: "600",
      lineHeight: 20,
      fontSize: 13,
    },
    statusBadge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 12,
    },
    statusBadgeText: {
      color: themeColors.white,
      fontWeight: "800",
      fontSize: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 12,
      backgroundColor: themeColors.inputBackground,
      color: themeColors.textPrimary,
      minHeight: 80,
      textAlignVertical: "top",
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    paymentFormWrap: {
      alignSelf: "center",
      width: "100%",
      maxWidth: 420,
    },
    paymentFormCard: {
      marginTop: 12,
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      backgroundColor: "#ffffff",
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 3,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    amountLabel: {
      color: themeColors.textSecondary,
      fontWeight: "700",
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    amountValue: {
      color: themeColors.textPrimary,
      fontWeight: "900",
      fontSize: 24,
    },
    secureBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: themeColors.primary,
      backgroundColor: `${themeColors.primary}1A`,
      paddingVertical: 5,
      paddingHorizontal: 10,
      marginBottom: 12,
      gap: 6,
    },
    secureText: {
      color: themeColors.primary,
      fontWeight: "800",
      fontSize: 12,
    },
    cardBrandRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 10,
      marginBottom: 2,
    },
    brandPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.inputBackground,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 999,
    },
    brandLabel: {
      fontSize: 11,
      fontWeight: "800",
      color: themeColors.textPrimary,
    },
    formLabel: {
      color: themeColors.textSecondary,
      fontWeight: "700",
      marginBottom: 6,
      marginTop: 6,
      fontSize: 12,
    },
    formInput: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 10,
      backgroundColor: themeColors.background,
      color: themeColors.textPrimary,
      minHeight: 44,
      paddingHorizontal: 12,
      marginBottom: 8,
      fontWeight: "600",
    },
    formInputFocused: {
      borderColor: "#2563eb",
      shadowColor: "#2563eb",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 1,
    },
    formInputInvalid: {
      borderColor: "#dc2626",
    },
    fieldErrorText: {
      color: "#dc2626",
      fontSize: 12,
      marginTop: -2,
      marginBottom: 8,
      fontWeight: "600",
    },
    paymentSuccessText: {
      marginTop: 10,
      color: "#16a34a",
      fontWeight: "800",
      fontSize: 14,
      textAlign: "center",
    },
    row: {
      flexDirection: "row",
      gap: 10,
    },
    starsRow: {
      flexDirection: "row",
      marginBottom: 10,
      gap: 8,
    },
  });

export default function BookingPaymentPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, user } = useAuthStore();
  const themeColors = useColors();
  const bookingId = String(params?.bookingId || "").trim();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [touchedFields, setTouchedFields] = useState({
    cardNumber: false,
    cardExpiry: false,
    cardCvv: false,
    cardName: false,
  });
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingDone, setRatingDone] = useState(false);
  const isStudent = String(user?.role || "") === "student";
  const isTutor = String(user?.role || "") === "tutor";
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const expiryInputRef = useRef(null);
  const cvvInputRef = useRef(null);
  const nameInputRef = useRef(null);

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

    router.replace("/(tabs)");
  };

  useEffect(() => {
    const loadBooking = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data?.message || "Booking not found.");
          setBooking(null);
          setPayment(null);
          return;
        }

        setBooking(data);
        setPayment(data?.payment || null);
      } catch (error) {
        console.error("Failed to load booking:", error);
        setErrorMessage("Failed to load booking details.");
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [bookingId, token]);

  const paymentState = useMemo(
    () => buildSessionState(booking, payment, { isStudent, isTutor }),
    [booking, payment, isStudent, isTutor],
  );
  const paymentStatus = normalizeStatus(payment?.status);
  const paymentAmount = Number(payment?.amount ?? booking?.price ?? 0);

  const formatCardNumber = (value) =>
    String(value || "")
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  const formatExpiry = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) {
      return digits;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const paymentFieldErrors = useMemo(() => {
    const errors = {
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      cardName: "",
    };

    if (!validateCardNumber(cardNumber)) {
      errors.cardNumber = "Card number must be 16 digits.";
    }

    if (!validateExpiryDate(cardExpiry)) {
      errors.cardExpiry = "Enter a valid future expiry date (MM/YY).";
    }

    if (!validateCvv(cardCvv)) {
      errors.cardCvv = "CVV must be exactly 3 digits.";
    }

    if (!validateCardholderName(cardName)) {
      errors.cardName = "Cardholder name is required and must contain letters only.";
    }

    return errors;
  }, [cardNumber, cardExpiry, cardCvv, cardName]);

  const isPaymentFormValid = useMemo(
    () => !Object.values(paymentFieldErrors).some(Boolean),
    [paymentFieldErrors],
  );

  const updateTouched = (field) => {
    setTouchedFields((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const showFieldError = (field) => touchedFields[field] && paymentFieldErrors[field];

  const refreshPayment = async () => {
    const response = await fetch(`${API_URL}/payments/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Failed to refresh payment");
    }
    setPayment(data?.payment || null);
  };

  const submitPaymentAction = async (endpoint, method = "PATCH", body = {}) => {
    const response = await fetch(`${API_URL}/payments/${bookingId}/${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: method === "GET" ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Action failed");
    }
    setPayment(data || null);
    return data;
  };

  const handleHoldPayment = async () => {
    if (!isPaymentFormValid) {
      setTouchedFields({
        cardNumber: true,
        cardExpiry: true,
        cardCvv: true,
        cardName: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setPaymentSuccessMessage("");
      const paymentMethodMasked = `**** **** **** ${String(cardNumber || "").replace(/\D/g, "").slice(-4)}`;
      const response = await fetch(`${API_URL}/payments/${bookingId}/hold`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to hold payment");
      }
      setPayment(data || null);
      setShowPaymentForm(false);
      setPaymentSuccessMessage("Payment Successful");
      setCardName("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setTouchedFields({
        cardNumber: false,
        cardExpiry: false,
        cardCvv: false,
        cardName: false,
      });

      router.replace({
        pathname: "/(tabs)/payment-success",
        params: {
          amount: String(Number(data?.amount ?? booking?.price ?? 0)),
          transactionId: String(data?.id || data?._id || `TXN-${Date.now()}`),
          paymentMethod: paymentMethodMasked,
          subject: String(booking?.subject || "Session"),
          sessionDate: String(booking?.sessionDate || ""),
          sessionTime: String(booking?.sessionTime || "N/A"),
          bookingId,
        },
      });
    } catch (error) {
      Alert.alert("Payment error", error.message || "Unable to hold payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSession = async () => {
    try {
      setIsSubmitting(true);
      await submitPaymentAction("student-confirm", "PATCH");
      await refreshPayment();
      Alert.alert("Confirmed", "Session confirmed. Payment released to tutor.");
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to confirm session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportProblem = async () => {
    if (!String(disputeReason || "").trim()) {
      Alert.alert("Reason required", "Please enter what went wrong before reporting a problem.");
      return;
    }

    try {
      setIsSubmitting(true);
      await submitPaymentAction("report-problem", "PATCH", { reason: disputeReason });
      await refreshPayment();
      Alert.alert("Dispute submitted", "Payment is frozen and admins were notified.");
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to report a problem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTutorCompleted = async () => {
    try {
      setIsSubmitting(true);
      await submitPaymentAction("tutor-complete", "PATCH");
      await refreshPayment();
      Alert.alert("Updated", "Student was notified to confirm session completion.");
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to mark session completed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRating = async () => {
    const tutorId = String(booking?.tutor?._id || booking?.tutor || "").trim();
    if (!tutorId) {
      Alert.alert("Tutor missing", "Unable to submit rating for this booking.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/tutors/${tutorId}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: ratingValue,
          comment: ratingComment,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to submit rating");
      }

      setRatingDone(true);
      Alert.alert("Thanks", "Your rating has been saved.");
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to save rating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const badgeColor = STATUS_COLORS[paymentState.badgeType] || STATUS_COLORS.warning;
  const canTutorMarkComplete = isTutor && normalizeStatus(payment?.status) === "pending" && !payment?.tutorConfirmed;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={20} color={themeColors.textDark || themeColors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Payment</Text>
      </View>

      {errorMessage ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {booking ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Tutor</Text>
              <Text style={styles.value}>{booking.tutorName || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Subject</Text>
              <Text style={styles.value}>{booking.subject || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.value}>{booking.sessionTime || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{booking.sessionDate ? new Date(booking.sessionDate).toDateString() : "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Status</Text>
              <View style={[styles.statusChip, { backgroundColor: themeColors.inputBackground }]}>
                <Text style={[styles.statusText, { color: themeColors.textSecondary }]}>{String(booking.status || "N/A").replace(/_/g, " ")}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Session Completion & Payment Protection</Text>
            <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.statusBadgeText}>{paymentState.badge}</Text>
            </View>
            <Text style={styles.helperText}>{paymentState.message}</Text>

            {paymentStatus === "pending" ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  Please confirm your session within 24-48 hours. Otherwise, the payment will be automatically released to the tutor.
                </Text>
              </View>
            ) : null}

            {paymentState.showPayButton ? (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => {
                  setShowPaymentForm((current) => !current);
                  setPaymentSuccessMessage("");
                }}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={themeColors.white} />
                ) : (
                  <Text style={styles.payButtonText}>{showPaymentForm ? "Hide Payment Form" : "Pay & Hold In Escrow"}</Text>
                )}
              </TouchableOpacity>
            ) : null}

            {paymentState.showPayButton && showPaymentForm ? (
              <View style={styles.paymentFormWrap}>
                <View style={styles.paymentFormCard}>
                  <View style={styles.amountRow}>
                    <View>
                      <Text style={styles.amountLabel}>Payment Amount</Text>
                      <Text style={styles.amountValue}>LKR {paymentAmount > 0 ? paymentAmount.toLocaleString() : "0"}</Text>
                    </View>
                    <View style={styles.cardBrandRow}>
                      <View style={styles.brandPill}>
                        <MaterialCommunityIcons name="visa" size={16} color="#1d4ed8" />
                        <Text style={styles.brandLabel}>Visa</Text>
                      </View>
                      <View style={styles.brandPill}>
                        <MaterialCommunityIcons name="mastercard" size={16} color="#ea580c" />
                        <Text style={styles.brandLabel}>MasterCard</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.secureBadge}>
                    <Ionicons name="lock-closed" size={14} color={themeColors.primary} />
                    <Text style={styles.secureText}>Encrypted Payment</Text>
                  </View>

                  <Text style={styles.formLabel}>Card Number</Text>
                  <TextInput
                    value={cardNumber}
                    onChangeText={(value) => {
                      const formatted = formatCardNumber(value);
                      setCardNumber(formatted);
                      updateTouched("cardNumber");
                      if (formatted.replace(/\D/g, "").length === 16) {
                        expiryInputRef.current?.focus();
                      }
                    }}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={themeColors.placeholderText}
                    style={[
                      styles.formInput,
                      focusedField === "cardNumber" && styles.formInputFocused,
                      showFieldError("cardNumber") && styles.formInputInvalid,
                    ]}
                    keyboardType="number-pad"
                    maxLength={19}
                    onFocus={() => setFocusedField("cardNumber")}
                    onBlur={() => {
                      setFocusedField("");
                      updateTouched("cardNumber");
                    }}
                  />
                  {showFieldError("cardNumber") ? <Text style={styles.fieldErrorText}>{paymentFieldErrors.cardNumber}</Text> : null}

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Expiry Date</Text>
                      <TextInput
                        value={cardExpiry}
                        ref={expiryInputRef}
                        onChangeText={(value) => {
                          const formatted = formatExpiry(value);
                          setCardExpiry(formatted);
                          updateTouched("cardExpiry");
                          if (formatted.length === 5) {
                            cvvInputRef.current?.focus();
                          }
                        }}
                        placeholder="MM/YY"
                        placeholderTextColor={themeColors.placeholderText}
                        style={[
                          styles.formInput,
                          focusedField === "expiry" && styles.formInputFocused,
                          showFieldError("cardExpiry") && styles.formInputInvalid,
                        ]}
                        keyboardType="number-pad"
                        maxLength={5}
                        onFocus={() => setFocusedField("expiry")}
                        onBlur={() => {
                          setFocusedField("");
                          updateTouched("cardExpiry");
                        }}
                      />
                      {showFieldError("cardExpiry") ? <Text style={styles.fieldErrorText}>{paymentFieldErrors.cardExpiry}</Text> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>CVV</Text>
                      <TextInput
                        value={cardCvv}
                        ref={cvvInputRef}
                        onChangeText={(value) => {
                          const formatted = String(value || "").replace(/\D/g, "").slice(0, 3);
                          setCardCvv(formatted);
                          updateTouched("cardCvv");
                          if (formatted.length === 3) {
                            nameInputRef.current?.focus();
                          }
                        }}
                        placeholder="123"
                        placeholderTextColor={themeColors.placeholderText}
                        style={[
                          styles.formInput,
                          focusedField === "cvv" && styles.formInputFocused,
                          showFieldError("cardCvv") && styles.formInputInvalid,
                        ]}
                        keyboardType="number-pad"
                        maxLength={3}
                        secureTextEntry
                        onFocus={() => setFocusedField("cvv")}
                        onBlur={() => {
                          setFocusedField("");
                          updateTouched("cardCvv");
                        }}
                      />
                      {showFieldError("cardCvv") ? <Text style={styles.fieldErrorText}>{paymentFieldErrors.cardCvv}</Text> : null}
                    </View>
                  </View>

                  <Text style={styles.formLabel}>Cardholder Name</Text>
                  <TextInput
                    value={cardName}
                    ref={nameInputRef}
                    onChangeText={(value) => {
                      setCardName(value.replace(/[^A-Za-z ]/g, ""));
                      updateTouched("cardName");
                    }}
                    placeholder="Name on card"
                    placeholderTextColor={themeColors.placeholderText}
                    style={[
                      styles.formInput,
                      focusedField === "cardName" && styles.formInputFocused,
                      showFieldError("cardName") && styles.formInputInvalid,
                    ]}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField("cardName")}
                    onBlur={() => {
                      setFocusedField("");
                      updateTouched("cardName");
                    }}
                  />
                  {showFieldError("cardName") ? <Text style={styles.fieldErrorText}>{paymentFieldErrors.cardName}</Text> : null}

                  <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: themeColors.primary, marginTop: 8 }]}
                    onPress={handleHoldPayment}
                    disabled={isSubmitting || !isPaymentFormValid}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={themeColors.white} />
                    ) : (
                      <Text style={styles.payButtonText}>Pay Now</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {canTutorMarkComplete ? (
              <TouchableOpacity style={styles.payButton} onPress={handleTutorCompleted} disabled={isSubmitting} activeOpacity={0.85}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={themeColors.white} />
                ) : (
                  <Text style={styles.payButtonText}>Mark As Completed</Text>
                )}
              </TouchableOpacity>
            ) : null}

            {paymentState.showConfirmButtons && isStudent ? (
              <>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSession} disabled={isSubmitting} activeOpacity={0.85}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={themeColors.white} />
                  ) : (
                    <Text style={styles.payButtonText}>Confirm Session</Text>
                  )}
                </TouchableOpacity>

                <TextInput
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  placeholder="If there is a problem, explain briefly"
                  placeholderTextColor={themeColors.placeholderText}
                  style={styles.input}
                  multiline
                />
                <TouchableOpacity style={styles.disputeButton} onPress={handleReportProblem} disabled={isSubmitting} activeOpacity={0.85}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={themeColors.white} />
                  ) : (
                    <Text style={styles.payButtonText}>Report Problem</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}

            {paymentState.showRating && isStudent ? (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Rate This Tutor</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                      <Ionicons name={star <= ratingValue ? "star" : "star-outline"} size={24} color={star <= ratingValue ? "#f59e0b" : themeColors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  placeholder="Add optional feedback"
                  placeholderTextColor={themeColors.placeholderText}
                  style={styles.input}
                />
                <TouchableOpacity style={[styles.payButton, ratingDone && styles.payButtonDisabled]} onPress={handleSubmitRating} disabled={ratingDone || isSubmitting}>
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={themeColors.white} />
                  ) : (
                    <Text style={styles.payButtonText}>{ratingDone ? "Rating Submitted" : "Submit Rating"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {!paymentState.showPayButton && !paymentState.showConfirmButtons && !canTutorMarkComplete && !paymentState.showRating ? (
              <TouchableOpacity
                style={[styles.payButton, styles.payButtonDisabled]}
                disabled
                activeOpacity={0.85}
              >
                <Text style={styles.payButtonText}>Waiting For Next Step</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
