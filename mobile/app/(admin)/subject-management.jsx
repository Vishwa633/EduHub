import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";

export default function AdminSubjectManagementPage() {
  const router = useRouter();
  const COLORS = useColors();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", image: "" });
  const [saving, setSaving] = useState(false);

  const loadSubjects = useCallback(async (isRefresh = false) => {
    try {
      if (String(user?.role || "") !== "admin") {
        setSubjects([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load subjects");
      }

      setSubjects(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert("Error", error.message || "Unable to load subjects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    loadSubjects(false);
  }, [loadSubjects]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Subject name is required");
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingSubject;
      const url = isEdit ? `${API_URL}/subjects/${editingSubject._id}` : `${API_URL}/subjects`;
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save subject");
      }

      setModalVisible(false);
      setEditingSubject(null);
      setFormData({ name: "", description: "", image: "" });
      loadSubjects(false);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Subject", "Are you sure you want to delete this subject?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/subjects/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
              const data = await response.json();
              throw new Error(data?.message || "Failed to delete subject");
            }
            loadSubjects(false);
          } catch (error) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  const openModal = (subject = null) => {
    setEditingSubject(subject);
    setFormData({
      name: subject ? subject.name : "",
      description: subject ? subject.description : "",
      image: subject && subject.image ? subject.image : "",
    });
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
      base64: true,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const base64Image = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
      setFormData((prev) => ({ ...prev, image: base64Image }));
    }
  };

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
      width: 40,
      height: 40,
      borderRadius: 12,
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
      fontSize: 24,
      fontWeight: "900",
    },
    subtitle: {
      color: COLORS.textSecondary,
      marginTop: 4,
      fontSize: 13,
    },
    addButton: {
      marginHorizontal: 20,
      marginBottom: 14,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.primary,
      flexDirection: "row",
      gap: 8,
    },
    addButtonText: {
      color: COLORS.white,
      fontWeight: "800",
      fontSize: 16,
    },
    card: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 18,
      padding: 16,
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    subjectName: {
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 4,
    },
    subjectDesc: {
      color: COLORS.textSecondary,
      fontSize: 13,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 16,
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    statText: {
      color: COLORS.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
    },
    actionBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    deleteBtn: {
      borderColor: "#fee2e2",
      backgroundColor: "#fef2f2",
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: COLORS.textPrimary,
    },
    deleteBtnText: {
      color: "#991b1b",
    },
    empty: {
      alignItems: "center",
      paddingTop: 40,
      paddingHorizontal: 20,
    },
    emptyText: {
      color: COLORS.textSecondary,
      marginTop: 10,
      textAlign: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: COLORS.textPrimary,
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: COLORS.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: COLORS.textPrimary,
      marginBottom: 16,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1,
    },
    cancelBtn: {
      backgroundColor: "transparent",
      borderColor: COLORS.border,
    },
    saveBtn: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    cancelBtnText: {
      color: COLORS.textPrimary,
      fontWeight: "700",
    },
    saveBtnText: {
      color: COLORS.white,
      fontWeight: "700",
    },
    imagePreviewContainer: {
      width: "100%",
      height: 120,
      borderRadius: 12,
      backgroundColor: COLORS.inputBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      overflow: "hidden",
    },
    imagePreview: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    uploadText: {
      marginTop: 8,
      fontSize: 13,
      color: COLORS.textSecondary,
      fontWeight: "600",
    },
    subjectImage: {
      width: "100%",
      height: 120,
      borderRadius: 12,
      marginBottom: 12,
      backgroundColor: COLORS.inputBackground,
    },
  }), [COLORS]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.subjectImage} />
      ) : null}
      <Text style={styles.subjectName}>{item.name}</Text>
      {!!item.description && <Text style={styles.subjectDesc}>{item.description}</Text>}
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color={COLORS.primary} />
          <Text style={styles.statText}>{item.tutorCount || 0} Tutors</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="school" size={16} color={COLORS.primary} />
          <Text style={styles.statText}>{item.studentCount || 0} Students</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openModal(item)}>
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item._id)}>
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark || COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Subjects</Text>
          <Text style={styles.subtitle}>Manage subjects, view tutor and student counts.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
        <Ionicons name="add" size={20} color={COLORS.white} />
        <Text style={styles.addButtonText}>Add Subject</Text>
      </TouchableOpacity>

      <FlatList
        data={subjects}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSubjects(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={42} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No subjects found.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingSubject ? "Edit Subject" : "Add Subject"}</Text>
            
            <TouchableOpacity style={styles.imagePreviewContainer} onPress={pickImage}>
              {formData.image ? (
                <Image source={{ uri: formData.image }} style={styles.imagePreview} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color={COLORS.textSecondary} />
                  <Text style={styles.uploadText}>Tap to add subject image</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Subject Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mathematics"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />

            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Brief description"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn, { opacity: saving ? 0.7 : 1 }]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
