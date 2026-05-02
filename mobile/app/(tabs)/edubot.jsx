import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
import SafeScreen from "../../components/SafeScreen";

export default function EduBotScreen() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm EduBot. How can I help you with your studies or the EduHub app today?",
      id: "1",
    },
  ]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuthStore();
  const COLORS = useColors();
  const flatListRef = useRef(null);

  const handleSend = async () => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: text.trim(),
      id: Date.now().toString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setText("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          { ...data, id: (Date.now() + 1).toString() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm sorry, I'm having some trouble connecting to my brain right now. Please try again later.",
            id: (Date.now() + 1).toString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.role === "user";
    return (
      <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        <View
          style={[
            styles.messageBubble,
            isMe
              ? { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 }
              : { backgroundColor: COLORS.cardBackground, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
          ]}
        >
          <Text style={[styles.messageText, { color: isMe ? COLORS.white : COLORS.textPrimary }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: COLORS.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
          <View style={styles.headerInfo}>
            <View style={[styles.botIcon, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="bulb" size={20} color={COLORS.white} />
            </View>
            <View>
              <Text style={[styles.headerName, { color: COLORS.textPrimary }]}>EduBot</Text>
              <Text style={[styles.headerStatus, { color: COLORS.primary }]}>AI Assistant</Text>
            </View>
          </View>
        </View>

        {/* Chat Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>EduBot is thinking...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { borderTopColor: COLORS.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: COLORS.cardBackground, color: COLORS.textPrimary, borderColor: COLORS.border }]}
            placeholder="Ask me about studies or the app..."
            placeholderTextColor={COLORS.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            disabled={isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: text.trim() && !isLoading ? COLORS.primary : COLORS.border }]}
            onPress={handleSend}
            disabled={!text.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color={COLORS.white} />
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  botIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageWrapper: {
    marginBottom: 15,
    maxWidth: "85%",
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
  },
  otherMessageWrapper: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 13,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxHeight: 100,
    borderWidth: 1,
    marginRight: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
});
