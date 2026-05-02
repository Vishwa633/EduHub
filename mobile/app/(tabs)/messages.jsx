import { useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useChatStore } from "../../store/chatStore";
import { useColors } from "../../hooks/useColors";
import SafeScreen from "../../components/SafeScreen";

export default function MessagesScreen() {
  const { getUsers, connectedUsers, isUsersLoading, setSelectedUser, connectSocket } = useChatStore();
  const COLORS = useColors();
  const router = useRouter();

  useEffect(() => {
    connectSocket();
    getUsers();
  }, []);

  const handleUserPress = (user) => {
    setSelectedUser(user);
    router.push(`/chat/${user._id}`);
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.userItem, { borderBottomColor: COLORS.border }]}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.border }]}>
            <Ionicons name="person" size={24} color={COLORS.textSecondary} />
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.username, { color: COLORS.textPrimary }]}>
          {item.tutorProfile?.fullName || item.username}
        </Text>
        <Text style={[styles.userRole, { color: COLORS.textSecondary }]}>
          {item.role === "tutor" ? item.tutorProfile?.subject || "Tutor" : "Student"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
    </TouchableOpacity>
  );

  return (
    <SafeScreen>
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]}>Messages</Text>
        </View>

        {isUsersLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : connectedUsers.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
            <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>No conversations yet</Text>
            <Text style={[styles.emptySubtext, { color: COLORS.textSecondary }]}>
              Chat will be available once your booking is accepted
            </Text>
          </View>
        ) : (
          <FlatList
            data={connectedUsers}
            keyExtractor={(item) => item._id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "700",
  },
  userRole: {
    fontSize: 13,
    marginTop: 2,
  },
});
