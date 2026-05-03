import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import SafeScreen from "../../components/SafeScreen";

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const {
    messages,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    subscribeToMessages,
    unsubscribeFromMessages,
    selectedUser,
  } = useChatStore();
  const { user } = useAuthStore();
  const COLORS = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [text, setText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    getMessages(id);
    subscribeToMessages();

    return () => {
      unsubscribeFromMessages();
    };
  }, [id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    if (editingMessageId) {
      await editMessage(editingMessageId, text.trim());
      setEditingMessageId(null);
    } else {
      await sendMessage({ text: text.trim() });
    }
    setText("");
  };

  const handleLongPress = (item) => {
    const userId = user?.id || user?._id;
    if (item.senderId !== userId || item.isDeleted) return;
    
    Alert.alert(
      "Message Options",
      "Choose an action",
      [
        { text: "Edit", onPress: () => {
            setEditingMessageId(item._id);
            setText(item.text);
          } 
        },
        { text: "Delete", style: "destructive", onPress: () => {
            Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteMessage(item._id) }
            ]);
          } 
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const renderMessage = ({ item }) => {
    const userId = user?.id || user?._id;
    const isMe = item.senderId === userId;
    const isDeleted = item.isDeleted;
    const displayColor = isDeleted ? (isMe ? "rgba(255,255,255,0.7)" : COLORS.textSecondary) : (isMe ? COLORS.white : COLORS.textPrimary);
    const fontStyle = isDeleted ? "italic" : "normal";
    
    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => handleLongPress(item)}
          style={[
            styles.messageBubble,
            isMe
              ? { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 }
              : { backgroundColor: COLORS.cardBackground, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
          ]}
        >
          <Text style={[styles.messageText, { color: displayColor, fontStyle }]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, { color: isMe ? "rgba(255,255,255,0.7)" : COLORS.textSecondary }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {item.isEdited && !isDeleted && (
              <Text style={[styles.messageTime, { color: isMe ? "rgba(255,255,255,0.7)" : COLORS.textSecondary, marginLeft: 4 }]}>
                (edited)
              </Text>
            )}
            {isMe && !isDeleted && (
              <Ionicons 
                name="checkmark-done" 
                size={14} 
                color="rgba(255,255,255,0.7)" 
                style={{ marginLeft: 4 }} 
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: COLORS.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            {selectedUser?.profileImage ? (
              <Image source={{ uri: selectedUser.profileImage }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatarPlaceholder, { backgroundColor: COLORS.border }]}>
                <Ionicons name="person" size={16} color={COLORS.textSecondary} />
              </View>
            )}
            <Text style={[styles.headerName, { color: COLORS.textPrimary }]}>
              {selectedUser?.tutorProfile?.fullName || selectedUser?.username || "Chat"}
            </Text>
          </View>
        </View>

        {/* Chat Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Area */}
        <View style={[styles.inputContainer, { borderTopColor: COLORS.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          {editingMessageId && (
            <TouchableOpacity 
              style={{ marginRight: 10 }}
              onPress={() => {
                setEditingMessageId(null);
                setText("");
              }}
            >
              <Ionicons name="close-circle" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          <TextInput
            style={[styles.input, { backgroundColor: COLORS.cardBackground, color: COLORS.textPrimary, borderColor: COLORS.border }]}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: text.trim() ? COLORS.primary : COLORS.border }]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Ionicons name={editingMessageId ? "checkmark" : "send"} size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 15,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageWrapper: {
    marginBottom: 15,
    maxWidth: "80%",
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
  },
  otherMessageWrapper: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    borderWidth: 1,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
