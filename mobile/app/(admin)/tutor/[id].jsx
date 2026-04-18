import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../../store/authStore";
import { useColors } from "../../../hooks/useColors";
import { API_URL } from "../../../constants/api";
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

const dayShort = (day) => String(day || "").slice(0, 3);
const formatDate = (value) => (value ? new Date(value).toLocaleString() : "N/A");

function InfoRow({ styles, label, value, valueStyle, labelStyle }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, labelStyle]}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]} numberOfLines={2}>
        {value || "N/A"}
      </Text>
    </View>
  );
}

function SectionCard({ styles, colors, title, icon, children, subtitle }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name={icon} size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </View>
      <View>{children}</View>
    </View>
  );
}

export default function AdminTutorDetailPage() {
  const router = useRouter();
  const colorSet = useColors();
  const COLORS = colorSet;
  const { id } = useLocalSearchParams();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const loadDetail = useCallback(async () => {
    try {
      if (!id || String(user?.role || "") !== "admin") {
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await fetch(`${API_URL}/tutors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load tutor details");
      }

      setDetail(data);
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to load tutor details");
    } finally {
      setLoading(false);
    }
  }, [id, token, user?.role]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

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
      width: 42,
      height: 42,
      borderRadius: 13,
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
      fontSize: 25,
      fontWeight: "900",
      letterSpacing: -0.4,
    },
    subtitle: {
      color: COLORS.textSecondary,
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
    },
    contentWrap: {
      paddingHorizontal: 20,
      paddingBottom: 28,
    },
    hero: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: 14,
      shadowColor: COLORS.black,
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 2,
    },
    heroTop: {
      flexDirection: "row",
      gap: 14,
      alignItems: "center",
      marginBottom: 14,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 18,
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    name: {
      color: COLORS.textPrimary,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 4,
      letterSpacing: -0.2,
    },
    mail: {
      color: COLORS.textSecondary,
      fontSize: 12,
      marginBottom: 8,
    },
    subjectPill: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: COLORS.primary,
      marginBottom: 8,
    },
    subjectPillText: {
      color: COLORS.white,
      fontWeight: "800",
      fontSize: 11,
    },
    roleChip: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: COLORS.inputBackground,
    },
    roleChipText: {
      color: COLORS.textSecondary,
      fontSize: 11,
      fontWeight: "800",
    },
    quickGrid: {
      flexDirection: "row",
      gap: 10,
    },
    quickCard: {
      flex: 1,
      borderRadius: 16,
      padding: 12,
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    quickLabel: {
      color: COLORS.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 4,
    },
    quickValue: {
      color: COLORS.textPrimary,
      fontSize: 14,
      fontWeight: "900",
    },
    sectionCard: {
      borderRadius: 22,
      padding: 16,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: 12,
      shadowColor: COLORS.black,
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 1,
    },
    sectionHeader: {
      marginBottom: 12,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sectionIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: COLORS.inputBackground,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    sectionTitle: {
      color: COLORS.textPrimary,
      fontSize: 15,
      fontWeight: "900",
    },
    sectionSubtitle: {
      color: COLORS.textSecondary,
      marginTop: 2,
      fontSize: 12,
      lineHeight: 17,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    infoLabel: {
      color: COLORS.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      flex: 1,
    },
    infoValue: {
      color: COLORS.textPrimary,
      fontSize: 12,
      fontWeight: "800",
      flex: 1,
      textAlign: "right",
    },
    infoStack: {
      gap: 10,
    },
    bio: {
      color: COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: COLORS.primary,
    },
    chipText: {
      color: COLORS.white,
      fontSize: 11,
      fontWeight: "800",
    },
    kycMeta: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },
    kycBadge: {
      flex: 1,
      borderRadius: 16,
      padding: 12,
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    kycBadgeLabel: {
      color: COLORS.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 4,
    },
    kycBadgeValue: {
      color: COLORS.textPrimary,
      fontSize: 14,
      fontWeight: "900",
    },
    docGrid: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },
    docColumn: {
      flex: 1,
      borderRadius: 16,
      padding: 10,
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    docTitle: {
      color: COLORS.textPrimary,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 8,
    },
    docImage: {
      width: "100%",
      height: 170,
      borderRadius: 12,
      backgroundColor: COLORS.cardBackground,
    },
    emptyDoc: {
      color: COLORS.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    galleryGrid: {
      gap: 10,
    },
    galleryCard: {
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    galleryThumb: {
      width: "100%",
      height: 180,
      backgroundColor: COLORS.cardBackground,
    },
    galleryMeta: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    galleryLabel: {
      color: COLORS.textPrimary,
      fontSize: 13,
      fontWeight: "900",
    },
    galleryHint: {
      color: COLORS.textSecondary,
      fontSize: 11,
      marginTop: 3,
      fontWeight: "700",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.72)",
      padding: 18,
      justifyContent: "center",
    },
    modalSheet: {
      borderRadius: 22,
      backgroundColor: COLORS.cardBackground,
      padding: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      maxHeight: "88%",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    modalTitle: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: "900",
      flex: 1,
      paddingRight: 10,
    },
    modalCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: COLORS.inputBackground,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    modalImage: {
      width: "100%",
      height: 420,
      backgroundColor: COLORS.inputBackground,
      borderRadius: 18,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.border,
      marginVertical: 12,
    },
  }), [COLORS]);

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

  if (!detail) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: COLORS.textSecondary, fontWeight: "800" }}>Tutor not found.</Text>
      </View>
    );
  }

  const kyc = detail?.tutorProfile?.kyc || {};
  const documentType = String(kyc?.documentType || "").toLowerCase();
  const availability = Array.isArray(detail?.tutorProfile?.availability)
    ? detail.tutorProfile.availability.filter((slot) => slot?.isAvailable)
    : [];
  const hasNic = documentType === "nic";
  const hasPassport = documentType === "passport";
  const galleryItems = [
    { key: "profile", title: "Profile Photo", uri: detail?.profileImage },
    { key: "nic-front", title: "NIC Front", uri: kyc?.nicFrontImage },
    { key: "nic-back", title: "NIC Back", uri: kyc?.nicBackImage },
    { key: "passport", title: "Passport Photo", uri: kyc?.passportImage },
  ];
  const visibleGalleryItems = galleryItems.filter((item) => item.uri);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark || COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Tutor Profile</Text>
          <Text style={styles.subtitle}>Professional overview of the tutor account and verification data.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentWrap}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <UserAvatar uri={detail?.profileImage} size={styles.avatar?.width || 120} borderRadius={styles.avatar?.borderRadius || 60} />
            <View style={{ flex: 1 }}>
              <View style={styles.subjectPill}>
                <Text style={styles.subjectPillText}>{detail?.tutorProfile?.subject || "Tutor"}</Text>
              </View>
              <Text style={styles.name}>{detail?.tutorProfile?.fullName || detail?.username || "N/A"}</Text>
              <Text style={styles.mail}>{detail?.email || "N/A"}</Text>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>Role: {detail?.role || "tutor"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.quickGrid}>
            <View style={styles.quickCard}>
              <Text style={styles.quickLabel}>Rating</Text>
              <Text style={styles.quickValue}>{Number(detail?.ratingSummary?.average || 0).toFixed(1)} ({detail?.ratingSummary?.count || 0})</Text>
            </View>
            <View style={styles.quickCard}>
              <Text style={styles.quickLabel}>Joined</Text>
              <Text style={styles.quickValue}>{formatDate(detail?.createdAt)}</Text>
            </View>
          </View>
        </View>

        <SectionCard styles={styles} colors={COLORS} title="User Details" icon="person-circle-outline" subtitle="Basic account information for the selected tutor.">
          <View style={styles.infoStack}>
            <InfoRow styles={styles} label="User ID" value={detail?._id || detail?.id} />
            <InfoRow styles={styles} label="Username" value={detail?.username} />
            <InfoRow styles={styles} label="Email" value={detail?.email} />
            <InfoRow styles={styles} label="Role" value={detail?.role} />
          </View>
        </SectionCard>

        <SectionCard styles={styles} colors={COLORS} title="Tutor Details" icon="school-outline" subtitle="Teaching profile, pricing, and availability.">
          <View style={styles.infoStack}>
            <InfoRow styles={styles} label="Full Name" value={detail?.tutorProfile?.fullName} />
            <InfoRow styles={styles} label="Subject" value={detail?.tutorProfile?.subject} />
            <InfoRow styles={styles} label="Mobile Number" value={detail?.tutorProfile?.mobileNumber} />
            <InfoRow styles={styles} label="Experience Level" value={detail?.tutorProfile?.experienceLevel} />
            <InfoRow
              styles={styles}
              label="Price"
              value={`LKR ${Number(detail?.tutorProfile?.price || 0).toLocaleString()} / ${detail?.tutorProfile?.priceType || "N/A"}`}
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bio}>{detail?.tutorProfile?.bio || "No bio provided."}</Text>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Availability</Text>
          {availability.length ? (
            <View style={styles.chipsWrap}>
              {availability.map((slot) => (
                <View key={`${slot.day}-${slot.from}-${slot.to}`} style={styles.chip}>
                  <Text style={styles.chipText}>{dayShort(slot.day)} {slot.from} - {slot.to}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.bio}>No availability set.</Text>
          )}
        </SectionCard>

        <SectionCard styles={styles} colors={COLORS} title="KYC Verification" icon="shield-checkmark-outline" subtitle="Identity documents uploaded during signup.">
          <View style={styles.kycMeta}>
            <View style={styles.kycBadge}>
              <Text style={styles.kycBadgeLabel}>Document Type</Text>
              <Text style={styles.kycBadgeValue}>{documentType || "N/A"}</Text>
            </View>
            <View style={styles.kycBadge}>
              <Text style={styles.kycBadgeLabel}>Status</Text>
              <Text style={styles.kycBadgeValue}>{hasNic || hasPassport ? "Submitted" : "Missing"}</Text>
            </View>
          </View>

          {hasNic ? (
            <View style={styles.infoStack}>
              <InfoRow styles={styles} label="NIC Number" value={kyc?.nicNumber} />
              <View style={styles.docGrid}>
                <View style={styles.docColumn}>
                  <Text style={styles.docTitle}>NIC Front</Text>
                  {kyc?.nicFrontImage ? (
                    <Image source={{ uri: kyc.nicFrontImage }} style={styles.docImage} contentFit="cover" />
                  ) : (
                    <Text style={styles.emptyDoc}>No front image available.</Text>
                  )}
                </View>
                <View style={styles.docColumn}>
                  <Text style={styles.docTitle}>NIC Back</Text>
                  {kyc?.nicBackImage ? (
                    <Image source={{ uri: kyc.nicBackImage }} style={styles.docImage} contentFit="cover" />
                  ) : (
                    <Text style={styles.emptyDoc}>No back image available.</Text>
                  )}
                </View>
              </View>
            </View>
          ) : null}

          {hasPassport ? (
            <View style={styles.infoStack}>
              <InfoRow styles={styles} label="Passport Number" value={kyc?.passportNumber} />
              <View style={styles.docColumn}>
                <Text style={styles.docTitle}>Passport Image</Text>
                {kyc?.passportImage ? (
                  <Image source={{ uri: kyc.passportImage }} style={styles.docImage} contentFit="cover" />
                ) : (
                  <Text style={styles.emptyDoc}>No passport image available.</Text>
                )}
              </View>
            </View>
          ) : null}

          {!hasNic && !hasPassport ? (
            <Text style={styles.bio}>No KYC document stored for this tutor.</Text>
          ) : null}
        </SectionCard>

        <SectionCard styles={styles} colors={COLORS} title="Photo Gallery" icon="images-outline" subtitle="Tap any image to view it full screen.">
          {visibleGalleryItems.length ? (
            <View style={styles.galleryGrid}>
              {visibleGalleryItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.galleryCard}
                  activeOpacity={0.88}
                  onPress={() => setPreviewImage(item)}
                >
                  <Image source={{ uri: item.uri }} style={styles.galleryThumb} contentFit="cover" />
                  <View style={styles.galleryMeta}>
                    <Text style={styles.galleryLabel}>{item.title}</Text>
                    <Text style={styles.galleryHint}>Tap to enlarge</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.bio}>No images available to preview.</Text>
          )}
        </SectionCard>
      </ScrollView>

      <Modal visible={Boolean(previewImage)} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{previewImage?.title || "Photo Preview"}</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
                <Ionicons name="close" size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {previewImage?.uri ? (
              <Image source={{ uri: previewImage.uri }} style={styles.modalImage} contentFit="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
