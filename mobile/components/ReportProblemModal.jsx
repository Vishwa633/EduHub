import { useState, useMemo } from "react";
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../constants/api";
import { useColors } from "../hooks/useColors";
import { useNotification } from "../store/notificationStore";

export default function ReportProblemModal({ visible, onClose, bookingId, token, onSuccess }) {
  const COLORS = useColors();
  const { addNotification } = useNotification();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modal: {
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 32,
      maxHeight: "85%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: 20,
      fontWeight: "800",
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: COLORS.inputBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      color: COLORS.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      backgroundColor: COLORS.inputBackground,
      color: COLORS.textPrimary,
      padding: 12,
      fontSize: 14,
      fontWeight: "500",
      minHeight: 120,
      textAlignVertical: "top",
    },
    helpText: {
      color: COLORS.textSecondary,
      fontSize: 12,
      marginTop: 6,
      fontStyle: "italic",
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 20,
    },
    button: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    submitButton: {
      backgroundColor: COLORS.primary,
    },
    buttonText: {
      fontWeight: "700",
      fontSize: 14,
    },
    cancelText: {
      color: COLORS.textPrimary,
    },
    submitText: {
      color: "#fff",
    },
  }), [COLORS]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert("Error", "Please describe the problem");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/payments/${bookingId}/report-problem`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to report problem");
      }

      addNotification("Problem reported successfully. Our team will review it soon.", "success");
      setReason("");
      onClose();
      onSuccess?.();
    } catch (error) {
      addNotification(error.message || "Unable to report problem", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Report Problem</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Describe the Issue</Text>
          <TextInput
            style={styles.input}
            placeholder="Explain what went wrong with this session..."
            placeholderTextColor={COLORS.textSecondary}
            value={reason}
            onChangeText={setReason}
            multiline
            editable={!loading}
          />
          <Text style={styles.helpText}>
            Be as detailed as possible so our team can review your case fairly.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={loading}>
              <Text style={[styles.buttonText, styles.cancelText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={[styles.buttonText, styles.submitText]}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
