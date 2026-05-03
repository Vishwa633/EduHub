import { useState, useLayoutEffect } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View, Dimensions, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { StorageAccessFramework, EncodingType, readAsStringAsync, writeAsStringAsync } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useAuthStore } from "../../store/authStore";

const { width: screenWidth } = Dimensions.get("window");

const getResponsiveSize = (baseSize) => {
  if (screenWidth < 360) return baseSize * 0.85;
  if (screenWidth < 420) return baseSize * 0.92;
  return baseSize;
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Premium color palette
const COLORS = {
  background: "#F8FAFB",
  cardBg: "#FFFFFF",
  primary: "#14B8A6",
  secondary: "#1F2937",
  accent: "#10B981",
  lightAccent: "#D1FAE5",
  text: "#1F2937",
  textLight: "#6B7280",
  border: "#E5E7EB",
  shadow: "#000000",
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollView: {
      flexGrow: 1,
    },
    centerContent: {
      alignItems: "center",
      paddingHorizontal: getResponsiveSize(16),
      paddingVertical: getResponsiveSize(24),
    },
    successBadgeWrap: {
      alignItems: "center",
      marginBottom: getResponsiveSize(32),
    },
    successCheckmark: {
      width: getResponsiveSize(64),
      height: getResponsiveSize(64),
      borderRadius: getResponsiveSize(32),
      backgroundColor: COLORS.lightAccent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: getResponsiveSize(16),
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    successTitle: {
      fontSize: getResponsiveSize(28),
      fontWeight: "900",
      color: COLORS.secondary,
      marginBottom: getResponsiveSize(8),
      textAlign: "center",
    },
    successSubtitle: {
      fontSize: getResponsiveSize(14),
      color: COLORS.textLight,
      textAlign: "center",
      lineHeight: getResponsiveSize(20),
    },
    receiptCard: {
      backgroundColor: COLORS.cardBg,
      borderRadius: getResponsiveSize(28),
      paddingHorizontal: getResponsiveSize(24),
      paddingVertical: getResponsiveSize(28),
      marginHorizontal: getResponsiveSize(16),
      marginBottom: getResponsiveSize(24),
      borderWidth: 1,
      borderColor: COLORS.border,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 6,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: getResponsiveSize(24),
      paddingBottom: getResponsiveSize(20),
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    brandName: {
      fontSize: getResponsiveSize(18),
      fontWeight: "800",
      color: COLORS.primary,
      letterSpacing: -0.5,
    },
    paymentBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getResponsiveSize(12),
      paddingVertical: getResponsiveSize(6),
      backgroundColor: COLORS.accent,
      borderRadius: 20,
      gap: getResponsiveSize(6),
    },
    badgeText: {
      fontSize: getResponsiveSize(12),
      fontWeight: "800",
      color: "#FFFFFF",
    },
    detailsSection: {
      marginBottom: getResponsiveSize(4),
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: getResponsiveSize(14),
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      gap: getResponsiveSize(12),
    },
    detailRow__last: {
      borderBottomWidth: 0,
    },
    detailIcon: {
      marginTop: getResponsiveSize(2),
      width: getResponsiveSize(20),
      alignItems: "center",
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      fontSize: getResponsiveSize(11),
      fontWeight: "700",
      color: COLORS.textLight,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: getResponsiveSize(4),
    },
    detailValue: {
      fontSize: getResponsiveSize(15),
      fontWeight: "600",
      color: COLORS.text,
      lineHeight: getResponsiveSize(22),
    },
    tutorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: getResponsiveSize(12),
    },
    tutorAvatar: {
      width: getResponsiveSize(36),
      height: getResponsiveSize(36),
      borderRadius: getResponsiveSize(18),
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tutorName: {
      fontSize: getResponsiveSize(15),
      fontWeight: "600",
      color: COLORS.text,
    },
    amountSection: {
      marginTop: getResponsiveSize(24),
      paddingVertical: getResponsiveSize(20),
      paddingHorizontal: getResponsiveSize(16),
      backgroundColor: COLORS.lightAccent,
      borderRadius: getResponsiveSize(16),
      alignItems: "center",
    },
    amountLabel: {
      fontSize: getResponsiveSize(12),
      fontWeight: "700",
      color: COLORS.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: getResponsiveSize(8),
    },
    amountValue: {
      fontSize: getResponsiveSize(32),
      fontWeight: "900",
      color: COLORS.accent,
      letterSpacing: -0.5,
    },
    actionsContainer: {
      paddingHorizontal: getResponsiveSize(16),
      paddingBottom: getResponsiveSize(24),
      gap: getResponsiveSize(12),
      flexDirection: screenWidth < 400 ? "column" : "row",
    },
    primaryBtn: {
      flex: 1,
      height: getResponsiveSize(56),
      backgroundColor: COLORS.accent,
      borderRadius: getResponsiveSize(14),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: getResponsiveSize(8),
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    secondaryBtn: {
      flex: 1,
      height: getResponsiveSize(56),
      backgroundColor: COLORS.cardBg,
      borderRadius: getResponsiveSize(14),
      borderWidth: 2,
      borderColor: COLORS.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: getResponsiveSize(8),
    },
    btnText: {
      fontSize: getResponsiveSize(15),
      fontWeight: "800",
      letterSpacing: 0.3,
    },
    bottomSpace: {
      height: getResponsiveSize(20),
    },
  });

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const styles = createStyles();
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });
  }, [navigation]);

  const amount = Number(params?.amount || 0);
  const transactionId = String(params?.transactionId || `TXN-${Date.now().toString().slice(-8)}`);
  const paymentMethod = String(params?.paymentMethod || "Card");
  const subject = String(params?.subject || "Subject Session");
  const tutorName = String(params?.tutorName || "Instructor");
  const sessionDate = String(params?.sessionDate || "");
  const sessionTime = String(params?.sessionTime || "N/A");
  const customerName = String(params?.customerName || user?.username || "Valued User");
  const amountLabel = `LKR ${amount.toLocaleString()}`;

  const buildReceiptHtml = () => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt</title>
      <style>
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap");
        body { font-family: "Inter", sans-serif; color: #1F2937; margin: 0; padding: 40px; background: #F8FAFB; }
        .receipt { max-width: 800px; margin: auto; background: white; border: 1px solid #E5E7EB; padding: 40px; border-radius: 28px; box-shadow: 0 12px 24px rgba(0,0,0,0.08); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #E5E7EB; padding-bottom: 30px; margin-bottom: 40px; }
        .brand { font-size: 20px; font-weight: 800; color: #14B8A6; }
        .badge { background: #10B981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 800; }
        .detail-section { margin-bottom: 30px; }
        .detail-row { display: flex; padding: 14px 0; border-bottom: 1px solid #E5E7EB; gap: 16px; }
        .detail-icon { width: 20px; color: #14B8A6; }
        .detail-label { font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; margin-bottom: 4px; }
        .detail-value { font-size: 15px; font-weight: 600; color: #1F2937; }
        .amount-section { background: #D1FAE5; padding: 20px; border-radius: 16px; text-align: center; margin: 30px 0; }
        .amount-label { font-size: 12px; font-weight: 700; color: #14B8A6; text-transform: uppercase; margin-bottom: 8px; }
        .amount-value { font-size: 32px; font-weight: 900; color: #10B981; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="brand">EduHub</div>
          <div class="badge">PAYMENT SUCCESSFUL</div>
        </div>
        <div class="detail-section">
          <div class="detail-row">
            <div class="detail-icon">🔖</div>
            <div>
              <div class="detail-label">Reference ID</div>
              <div class="detail-value">${escapeHtml(transactionId)}</div>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-icon">👤</div>
            <div>
              <div class="detail-label">Customer</div>
              <div class="detail-value">${escapeHtml(customerName)}</div>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-icon">📚</div>
            <div>
              <div class="detail-label">Subject</div>
              <div class="detail-value">${escapeHtml(subject)}</div>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-icon">👨‍🏫</div>
            <div>
              <div class="detail-label">Tutor</div>
              <div class="detail-value">${escapeHtml(tutorName)}</div>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-icon">📅</div>
            <div>
              <div class="detail-label">Session Date</div>
              <div class="detail-value">${escapeHtml(new Date(sessionDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))}</div>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-icon">🕐</div>
            <div>
              <div class="detail-label">Time</div>
              <div class="detail-value">${escapeHtml(sessionTime)}</div>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-icon">💳</div>
            <div>
              <div class="detail-label">Payment Method</div>
              <div class="detail-value">${escapeHtml(paymentMethod)}</div>
            </div>
          </div>
        </div>
        <div class="amount-section">
          <div class="amount-label">Total Amount</div>
          <div class="amount-value">${escapeHtml(amountLabel)}</div>
        </div>
        <div style="text-align: center; margin-top: 40px; color: #6B7280; font-size: 13px;">
          <p>Thank you for choosing EduHub for your educational needs.</p>
          <p>Need support? Contact us at support@tutorslage.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const sanitizeFileName = (name) => String(name || "receipt").replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const handleDownload = async () => {
    try {
      setIsProcessingPdf(true);
      const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml() });
      const safeReference = sanitizeFileName(transactionId);
      const fileName = `receipt-${safeReference}.pdf`;

      if (Platform.OS === "android") {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
          await StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, "application/pdf")
            .then(async (safUri) => {
              await writeAsStringAsync(safUri, base64, { encoding: EncodingType.Base64 });
              Alert.alert("Success", "Receipt has been saved to your downloads.");
            });
        }
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch (err) {
      Alert.alert("Error", "Could not generate PDF receipt.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsProcessingPdf(true);
      const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml() });
      await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (err) {
      Alert.alert("Error", "Could not share receipt.");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleDone = () => {
    router.replace("/(tabs)/create");
  };

  const getTutorInitials = () => tutorName.split(" ").map((n) => n[0]).join("").toUpperCase();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollView}>
      {/* Success Badge Section */}
      <View style={styles.centerContent}>
        <View style={styles.successBadgeWrap}>
          <View style={styles.successCheckmark}>
            <Ionicons name="checkmark" size={getResponsiveSize(32)} color={COLORS.accent} />
          </View>
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successSubtitle}>Your session with {tutorName} is now confirmed</Text>
        </View>
      </View>

      {/* Receipt Card */}
      <View style={styles.receiptCard}>
        {/* Badge Row */}
        <View style={styles.badgeRow}>
          <Text style={styles.brandName}>EduHub Receipt</Text>
          <View style={styles.paymentBadge}>
            <Ionicons name="checkmark-circle" size={getResponsiveSize(14)} color="#FFFFFF" />
            <Text style={styles.badgeText}>PAID</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          {/* Reference ID */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="receipt" size={getResponsiveSize(18)} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Transaction ID</Text>
              <Text style={styles.detailValue}>{transactionId}</Text>
            </View>
          </View>

          {/* Customer */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="person" size={getResponsiveSize(18)} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Student</Text>
              <Text style={styles.detailValue}>{customerName}</Text>
            </View>
          </View>

          {/* Email */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="mail" size={getResponsiveSize(18)} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{user?.email || "N/A"}</Text>
            </View>
          </View>

          {/* Subject */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="book" size={getResponsiveSize(18)} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Subject</Text>
              <Text style={styles.detailValue}>{subject}</Text>
            </View>
          </View>

          {/* Tutor with Avatar */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="person-circle" size={getResponsiveSize(18)} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Instructor</Text>
              <View style={styles.tutorRow}>
                <View style={styles.tutorAvatar}>
                  <Text style={{ fontSize: getResponsiveSize(14), fontWeight: "800", color: "#FFFFFF" }}>{getTutorInitials()}</Text>
                </View>
                <Text style={styles.tutorName}>{tutorName}</Text>
              </View>
            </View>
          </View>

          {/* Session Date */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar" size={getResponsiveSize(18)} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Session Date</Text>
              <Text style={styles.detailValue}>{new Date(sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
            </View>
          </View>

          {/* Time */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time" size={getResponsiveSize(18)} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{sessionTime}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={[styles.detailRow, styles.detailRow__last]}>
            <View style={styles.detailIcon}>
              <Ionicons name="card" size={getResponsiveSize(18)} color={COLORS.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{paymentMethod}</Text>
            </View>
          </View>
        </View>

        {/* Amount Section */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>{amountLabel}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleDownload} disabled={isProcessingPdf}>
          <Ionicons name="download" size={getResponsiveSize(18)} color={COLORS.primary} />
          <Text style={[styles.btnText, { color: COLORS.primary }]}>Download</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare} disabled={isProcessingPdf}>
          <Ionicons name="share-social" size={getResponsiveSize(18)} color={COLORS.primary} />
          <Text style={[styles.btnText, { color: COLORS.primary }]}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleDone} activeOpacity={0.8}>
          <Ionicons name="arrow-forward" size={getResponsiveSize(18)} color="#FFFFFF" />
          <Text style={[styles.btnText, { color: "#FFFFFF" }]}>Sessions</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}
