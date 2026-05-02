import { useState, useLayoutEffect } from "react";
import { Alert, ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View, Dimensions, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useColors } from "../../hooks/useColors";
import { useAuthStore } from "../../store/authStore";

const { width: screenWidth } = Dimensions.get("window");

const getResponsiveSize = (baseSize) => {
  if (screenWidth < 360) return baseSize * 0.85;
  if (screenWidth < 420) return baseSize * 0.92;
  return baseSize;
};

const formatDateTime = (input) => {
  if (!input) {
    return new Date().toLocaleString();
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString();
  }

  return date.toLocaleString();
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeFileName = (value) => String(value || "receipt").replace(/[^a-zA-Z0-9_-]/g, "");

const createStyles = (themeColors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    headerGradient: {
      paddingBottom: getResponsiveSize(40),
      paddingTop: getResponsiveSize(60),
      alignItems: "center",
      backgroundColor: themeColors.primary,
      borderBottomLeftRadius: getResponsiveSize(32),
      borderBottomRightRadius: getResponsiveSize(32),
    },
    successIconWrap: {
      width: getResponsiveSize(80),
      height: getResponsiveSize(80),
      borderRadius: getResponsiveSize(40),
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: getResponsiveSize(16),
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.4)",
    },
    successTitle: {
      fontSize: getResponsiveSize(26),
      fontWeight: "900",
      color: themeColors.white,
      textAlign: "center",
    },
    successSubtitle: {
      fontSize: getResponsiveSize(14),
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: getResponsiveSize(4),
      textAlign: "center",
    },
    content: {
      flex: 1,
      marginTop: getResponsiveSize(-30),
      paddingHorizontal: getResponsiveSize(20),
      paddingBottom: getResponsiveSize(20),
    },
    receiptCard: {
      backgroundColor: themeColors.cardBackground,
      borderRadius: getResponsiveSize(24),
      padding: getResponsiveSize(24),
      borderWidth: 1,
      borderColor: themeColors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
    },
    receiptLogoWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: getResponsiveSize(24),
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      paddingBottom: getResponsiveSize(16),
    },
    receiptLogo: {
      fontSize: getResponsiveSize(20),
      fontWeight: "900",
      color: themeColors.primary,
      letterSpacing: -0.5,
    },
    receiptStatus: {
      fontSize: getResponsiveSize(12),
      fontWeight: "800",
      color: "#059669",
      backgroundColor: "#ECFDF5",
      paddingHorizontal: getResponsiveSize(10),
      paddingVertical: getResponsiveSize(4),
      borderRadius: 99,
      textTransform: "uppercase",
    },
    receiptBody: {
      marginTop: getResponsiveSize(8),
    },
    tableHeader: {
      backgroundColor: "#f8fafc",
      flexDirection: "row",
      paddingVertical: getResponsiveSize(12),
      paddingHorizontal: getResponsiveSize(12),
      borderBottomWidth: 2,
      borderBottomColor: themeColors.primary,
      borderRadius: getResponsiveSize(8),
      marginBottom: 0,
    },
    tableHeaderLabel: {
      flex: 1,
      fontSize: getResponsiveSize(12),
      fontWeight: "800",
      color: themeColors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: screenWidth < 400 ? "column" : "row",
      paddingVertical: getResponsiveSize(12),
      paddingHorizontal: getResponsiveSize(12),
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      alignItems: screenWidth < 400 ? "flex-start" : "center",
    },
    tableCell: {
      flex: 1,
      paddingRight: getResponsiveSize(8),
      width: screenWidth < 400 ? "100%" : "auto",
      marginBottom: screenWidth < 400 ? getResponsiveSize(8) : 0,
    },
    tableCellLabel: {
      fontSize: getResponsiveSize(11),
      fontWeight: "600",
      color: themeColors.textSecondary,
      marginBottom: getResponsiveSize(4),
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    tableCellValue: {
      fontSize: getResponsiveSize(14),
      fontWeight: "700",
      color: themeColors.textPrimary,
    },
    receiptRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    receiptLabel: {
      fontSize: getResponsiveSize(13),
      color: themeColors.textSecondary,
      fontWeight: "600",
    },
    receiptValue: {
      fontSize: getResponsiveSize(14),
      color: themeColors.textPrimary,
      fontWeight: "800",
      textAlign: "right",
    },
    amountWrap: {
      marginTop: getResponsiveSize(16),
      paddingTop: getResponsiveSize(12),
      paddingHorizontal: getResponsiveSize(12),
      paddingVertical: getResponsiveSize(12),
      borderTopWidth: 2,
      borderTopColor: themeColors.primary,
      flexDirection: screenWidth < 400 ? "column" : "row",
      justifyContent: "space-between",
      alignItems: screenWidth < 400 ? "flex-start" : "center",
      backgroundColor: "#f0f9ff",
      borderRadius: getResponsiveSize(8),
    },
    amountLabel: {
      fontSize: getResponsiveSize(16),
      fontWeight: "700",
      color: themeColors.textPrimary,
    },
    amountValue: {
      fontSize: getResponsiveSize(22),
      fontWeight: "900",
      color: themeColors.primary,
      marginTop: screenWidth < 400 ? getResponsiveSize(8) : 0,
    },
    actionsWrap: {
      marginTop: getResponsiveSize(24),
      gap: getResponsiveSize(12),
      paddingBottom: getResponsiveSize(20),
    },
    primaryBtn: {
      height: getResponsiveSize(56),
      backgroundColor: themeColors.primary,
      borderRadius: getResponsiveSize(16),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: getResponsiveSize(10),
    },
    secondaryBtn: {
      height: getResponsiveSize(56),
      backgroundColor: themeColors.cardBackground,
      borderRadius: getResponsiveSize(16),
      borderWidth: 1.5,
      borderColor: themeColors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: getResponsiveSize(10),
    },
    btnText: {
      fontSize: getResponsiveSize(16),
      fontWeight: "800",
    },
    footerActions: {
      flexDirection: screenWidth < 400 ? "column" : "row",
      gap: getResponsiveSize(12),
    },
    halfBtn: {
      flex: 1,
    },
  });
};

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const themeColors = useColors();
  const user = useAuthStore((state) => state.user);
  const styles = createStyles(themeColors);

  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });
  }, [navigation]);

  const amount = Number(params?.amount || 0);
  const transactionId = String(params?.transactionId || `TXN-${Date.now().toString().slice(-8)}`);
  const paymentMethod = String(params?.paymentMethod || "Card Processing");
  const subject = String(params?.subject || "Subject Session");
  const tutorName = String(params?.tutorName || "Instructor");
  const sessionDate = String(params?.sessionDate || "");
  const sessionTime = String(params?.sessionTime || "N/A");
  const bookingId = String(params?.bookingId || "");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const appName = "TutorSlage";
  const customerName = String(params?.customerName || user?.username || "Valued User");
  const supportEmail = "support@tutorslage.com";
  const receiptReference = transactionId;
  const returnTo = String(params?.returnTo || "").trim();

  const formattedDate = sessionDate ? new Date(sessionDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }) : new Date().toLocaleDateString();

  const receiptDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const amountLabel = `LKR ${amount.toLocaleString()}`;

  const buildReceiptHtml = () => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt - ${escapeHtml(appName)}</title>
      <style>
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap");
        body { font-family: "Inter", sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #fff; }
        .receipt-container { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; margin-bottom: 40px; }
        .logo-wrap { display: flex; align-items: center; gap: 10px; }
        .logo-box { background: ${themeColors.primary}; color: white; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; box-shadow: 0 4px 10px ${themeColors.primary}44; }
        .brand-name { font-size: 26px; font-weight: 800; color: ${themeColors.primary}; letter-spacing: -1px; }
        .receipt-label { text-align: right; }
        .receipt-label h1 { margin: 0; font-size: 32px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -1px; }
        .receipt-label p { margin: 5px 0 0; color: #64748b; font-size: 14px; font-weight: 600; }
        
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .info-section h3 { font-size: 13px; text-transform: uppercase; color: #94a3b8; margin-bottom: 15px; letter-spacing: 1px; }
        .info-card { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; }
        .info-item { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .info-item:last-child { margin-bottom: 0; }
        .info-label { color: #64748b; font-size: 14px; }
        .info-value { color: #1e293b; font-size: 14px; font-weight: 700; }
        
        .table-wrap { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .table-wrap th { text-align: left; padding: 15px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-transform: uppercase; }
        .table-wrap td { padding: 15px; border-bottom: 1px solid #f1f5f9; }
        .item-name { font-weight: 700; color: #0f172a; font-size: 15px; }
        .item-desc { color: #64748b; font-size: 13px; margin-top: 4px; }
        
        .summary-wrap { display: flex; justify-content: flex-end; }
        .summary-card { width: 300px; }
        .summary-item { display: flex; justify-content: space-between; padding: 10px 0; }
        .total-row { border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 15px; color: ${themeColors.primary}; }
        .total-label { font-size: 18px; font-weight: 800; }
        .total-amount { font-size: 20px; font-weight: 800; }
        
        .footer { text-align: center; margin-top: 60px; border-top: 1px solid #f1f5f9; padding-top: 30px; }
        .footer p { color: #94a3b8; font-size: 13px; line-height: 1.6; }
        .status-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 99px; font-weight: 700; font-size: 12px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <div class="logo-wrap">
            <div class="logo-box">${escapeHtml(appName.slice(0, 1).toUpperCase())}</div>
            <div class="brand-name">${escapeHtml(appName)}</div>
          </div>
          <div class="receipt-label">
            <h1>Receipt</h1>
            <p>Ref: ${escapeHtml(transactionId)}</p>
            <div class="status-badge">PAID SUCCESSFUL</div>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-section">
            <h3>Billed To</h3>
            <div class="info-card">
              <div class="info-value" style="font-size: 18px; margin-bottom: 5px;">${escapeHtml(customerName)}</div>
              <div class="info-label">${escapeHtml(user?.email || "verified_user@eduhub.app")}</div>
            </div>
          </div>
          <div class="info-section">
            <h3>Transaction Details</h3>
            <div class="info-card">
              <div class="info-item">
                <span class="info-label">Date</span>
                <span class="info-value">${escapeHtml(new Date().toLocaleDateString())}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Payment Method</span>
                <span class="info-value">${escapeHtml(paymentMethod)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value" style="color: #16a34a;">Completed</span>
              </div>
            </div>
          </div>
        </div>
        
        <table class="table-wrap">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="item-name">${escapeHtml(subject)} Session</div>
                <div class="item-desc">Instructor: ${escapeHtml(tutorName)} | ${escapeHtml(formattedDate)} at ${escapeHtml(sessionTime)}</div>
              </td>
              <td style="text-align: right; font-weight: 700;">${escapeHtml(amountLabel)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="summary-wrap">
          <div class="summary-card">
            <div class="summary-item">
              <span class="info-label">Subtotal</span>
              <span class="info-value">${escapeHtml(amountLabel)}</span>
            </div>
            <div class="summary-item">
              <span class="info-label">Tax (0%)</span>
              <span class="info-value">LKR 0.00</span>
            </div>
            <div class="summary-item total-row">
              <span class="total-label">Total</span>
              <span class="total-amount">${escapeHtml(amountLabel)}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing <strong>EduHub</strong> for your educational needs.</p>
          <p>Need support? Contact us at <strong>${escapeHtml(supportEmail)}</strong></p>
          <div style="margin-top: 20px; font-size: 10px; color: #cbd5e1;">Generated on ${escapeHtml(new Date().toLocaleString())}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const handleDownload = async () => {
    try {
      setIsProcessingPdf(true);
      const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml() });
      const safeReference = sanitizeFileName(transactionId);
      const fileName = `receipt-${safeReference}.pdf`;

      if (Platform.OS === "android") {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, "application/pdf")
            .then(async (safUri) => {
              await FileSystem.writeAsStringAsync(safUri, base64, { encoding: FileSystem.EncodingType.Base64 });
              Alert.alert("Success", "Receipt has been saved to your downloads.");
            });
        }
      } else {
        await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      }
    } catch (err) {
      Alert.alert("Error", "Could not download PDF receipt.");
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
    router.replace("/(tabs)/sessions");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerGradient}>
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark-sharp" size={getResponsiveSize(42)} color={themeColors.white} />
        </View>
        <Text style={styles.successTitle}>Payment Received!</Text>
        <Text style={styles.successSubtitle}>Session with {tutorName} is now confirmed</Text>
      </View>

      <View style={[styles.content, { flex: 0 }]}>
        <View style={styles.receiptCard}>
          <View style={styles.receiptLogoWrap}>
            <Text style={styles.receiptLogo}>{appName}.receipt</Text>
            <Text style={styles.receiptStatus}>Paid</Text>
          </View>

          <View style={styles.receiptBody}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderLabel, { flex: screenWidth < 400 ? 1 : 1.2 }]}>Details</Text>
              <Text style={[styles.tableHeaderLabel, { flex: 1 }]}>Information</Text>
            </View>

            {/* Table Rows */}
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: screenWidth < 400 ? 1 : 1.2 }]}>
                <Text style={styles.tableCellLabel}>Reference ID</Text>
                <Text style={styles.tableCellValue}>{transactionId}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellLabel}>Status</Text>
                <Text style={[styles.tableCellValue, { color: "#059669" }]}>PAID</Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: screenWidth < 400 ? 1 : 1.2 }]}>
                <Text style={styles.tableCellLabel}>Customer</Text>
                <Text style={styles.tableCellValue}>{customerName}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellLabel}>Email</Text>
                <Text style={styles.tableCellValue}>{user?.email || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: screenWidth < 400 ? 1 : 1.2 }]}>
                <Text style={styles.tableCellLabel}>Subject</Text>
                <Text style={styles.tableCellValue}>{subject}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellLabel}>Tutor</Text>
                <Text style={styles.tableCellValue}>{tutorName}</Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: screenWidth < 400 ? 1 : 1.2 }]}>
                <Text style={styles.tableCellLabel}>Session Date</Text>
                <Text style={styles.tableCellValue}>{new Date(sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellLabel}>Time</Text>
                <Text style={styles.tableCellValue}>{sessionTime}</Text>
              </View>
            </View>

            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: screenWidth < 400 ? 1 : 1.2 }]}>
                <Text style={styles.tableCellLabel}>Payment Method</Text>
                <Text style={styles.tableCellValue}>{paymentMethod}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellLabel}>Transaction Date</Text>
                <Text style={styles.tableCellValue}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
              </View>
            </View>

            {/* Total Amount */}
            <View style={styles.amountWrap}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>{amountLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsWrap}>
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={handleDone} 
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, {color: themeColors.white}]}>Done</Text>
          </TouchableOpacity>

          <View style={styles.footerActions}>
            <TouchableOpacity 
              style={[styles.secondaryBtn, styles.halfBtn]} 
              onPress={handleDownload}
              disabled={isProcessingPdf}
            >
              {isProcessingPdf ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={getResponsiveSize(20)} color={themeColors.primary} />
                  <Text style={[styles.btnText, {color: themeColors.primary}]}>PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryBtn, styles.halfBtn]} 
              onPress={handleShare}
              disabled={isProcessingPdf}
            >
              <Ionicons name="share-outline" size={getResponsiveSize(20)} color={themeColors.primary} />
              <Text style={[styles.btnText, {color: themeColors.primary}]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
