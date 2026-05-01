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
    { key: "notifications", label: `Notifications (${unreadAlertCount})`, icon: "notifications-outline", onPress: () => { onClose(); actions.openNotifications?.(); } },
  ];

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.panel, { backgroundColor: COLORS.cardBackground, borderColor: COLORS.border }]}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.border }]}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.userName, { color: COLORS.textPrimary }]}>{user?.fullName || user?.username || "Admin"}</Text>
              <Text style={[styles.userRole, { color: COLORS.textSecondary }]}>Administrator</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.menu}>
          {items.map((it) => (
            <TouchableOpacity key={it.key} style={[styles.menuItem, { borderColor: COLORS.border }]} onPress={it.onPress}>
              <Ionicons name={it.icon} size={20} color={COLORS.primary} />
              <Text style={[styles.menuLabel, { color: COLORS.textPrimary }]}>{it.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.logout, { borderColor: COLORS.border }]} onPress={() => { onClose(); actions.onLogout?.(); }}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.logoutText, { color: COLORS.textPrimary }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    width: 280,
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderLeftWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
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
    marginTop: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingRight: 8,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 10,
  },
  footer: {
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderRadius: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontWeight: "900",
    marginLeft: 8,
  },
});
