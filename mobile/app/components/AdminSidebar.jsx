import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "../../hooks/useColors";

export default function AdminSidebar({ visible, onClose, actions = {}, user = {}, pendingTutorCount = 0, unreadAlertCount = 0 }) {
  const COLORS = useColors();
  if (!visible) return null;

  const items = [
    { key: "dashboard", label: "Dashboard", icon: "grid-outline", onPress: () => { onClose(); } },
    { key: "sessions", label: "Sessions", icon: "calendar-outline", onPress: () => { onClose(); actions.openSessions?.(); } },
    { key: "users", label: "Users", icon: "people-outline", onPress: () => { onClose(); actions.openUserDetails?.(); } },
    { key: "pending", label: `Pending (${pendingTutorCount})`, icon: "time-outline", onPress: () => { onClose(); actions.openPendingTutors?.(); } },
    { key: "payments", label: "Payments", icon: "cash-outline", onPress: () => { onClose(); actions.openPayments?.(); } },
    { key: "inquiries", label: "Inquiries", icon: "help-circle-outline", onPress: () => { onClose(); actions.openInquiries?.(); } },
    { key: "notifications", label: `Notifications (${unreadAlertCount})`, icon: "notifications-outline", onPress: () => { onClose(); actions.openNotifications?.(); } },
  ];

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.panel, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
        <View style={[styles.header, { borderColor: COLORS.border }]}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.border }]}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.userName, { color: COLORS.textPrimary }]}>{user?.fullName || user?.username || "Admin"}</Text>
              <Text style={[styles.userRole, { color: COLORS.textSecondary }]}>Administrator</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.6}>
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: COLORS.textPrimary }]}>Quick Menu</Text>

        <View style={styles.menu}>
          {items.map((it) => (
            <TouchableOpacity
              key={it.key}
              style={[styles.menuItem, { borderColor: COLORS.border, backgroundColor: COLORS.white }]}
              onPress={it.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { borderColor: COLORS.border, backgroundColor: COLORS.inputBackground }]}> 
                <Ionicons name={it.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: COLORS.textPrimary }]}>{it.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.logout, { borderColor: COLORS.border, backgroundColor: COLORS.white }]}
            onPress={() => { onClose(); actions.onLogout?.(); }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { borderColor: COLORS.border, backgroundColor: COLORS.inputBackground }]}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={[styles.logoutText, { color: COLORS.primary }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  panel: {
    width: 320,
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 28,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "900",
  },
  userRole: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  menu: {
    marginTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 12,
  },
  footer: {
    marginTop: 16,
    paddingTop: 0,
  },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    fontWeight: "900",
    marginLeft: 8,
  },
});
