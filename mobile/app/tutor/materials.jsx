import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import Loader from "../../components/Loader";

const SUBJECTS = ["Mathematics", "Science", "English", "History", "ICT", "Music", "Art"];
const TYPES = [
  { id: "tute", label: "Tute" },
  { id: "book", label: "Book" },
  { id: "quiz", label: "Quiz" },
];

export default function TutorMaterials() {
  const router = useRouter();
  const { token } = useAuthStore();
  const COLORS = useColors();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // New Material Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [type, setType] = useState("tute");
  const [price, setPrice] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMaterials = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`${API_URL}/materials/tutor-uploads`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch materials");

      setMaterials(data);
    } catch (error) {
      console.error("❌ Error fetching tutor materials:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !price || !selectedFile) {
      Alert.alert("Error", "Title, Price and PDF file are required");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("subject", subject);
      formData.append("type", type);
      formData.append("price", price);
      
      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: "application/pdf",
      });

      const response = await fetch(`${API_URL}/materials/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Upload failed");

      Alert.alert("Success", "Material uploaded successfully!");
      setModalVisible(false);
      resetForm();
      fetchMaterials(true);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (materialId) => {
    Alert.alert(
      "Delete Material",
      "Are you sure? Students who purchased this will no longer be able to access it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/materials/${materialId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!response.ok) throw new Error("Delete failed");
              Alert.alert("Success", "Material deleted");
              fetchMaterials(true);
            } catch (error) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setTitle(material.title);
    setDescription(material.description);
    setPrice(String(material.price));
    setSubject(material.subject);
    setType(material.type);
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_URL}/materials/${editingMaterial._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          price: Number(price),
          subject,
          type,
        }),
      });

      if (!response.ok) throw new Error("Update failed");

      Alert.alert("Success", "Material updated");
      setModalVisible(false);
      setEditingMaterial(null);
      resetForm();
      fetchMaterials(true);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingMaterial(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setSelectedFile(null);
  };

  const renderMaterialItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: COLORS.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.meta, { color: COLORS.textSecondary }]}>
            {item.subject} • {item.type.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.priceText, { color: COLORS.primary }]}>LKR {item.price}</Text>
      </View>
      <Text style={[styles.descriptionText, { color: COLORS.textSecondary }]} numberOfLines={2}>
        {item.description || "No description"}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.dateText, { color: COLORS.textSecondary }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
             <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconBtn}>
             <Ionicons name="trash-outline" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]}>My Materials</Text>
          <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
            Manage your tutes, books and quizzes
          </Text>
        </View>
      </View>

      <FlatList
        data={materials}
        keyExtractor={(item) => item._id}
        renderItem={renderMaterialItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchMaterials(true)} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cloud-upload-outline" size={64} color={COLORS.textSecondary} />
            <Text style={[styles.emptyText, { color: COLORS.textPrimary }]}>No materials uploaded</Text>
            <Text style={[styles.emptySubtext, { color: COLORS.textSecondary }]}>
              Click the + button to upload your first material
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: COLORS.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.textPrimary }]}>
                {editingMaterial ? "Edit Material" : "Upload Material"}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.textSecondary }]}>Title</Text>
                <TextInput
                  style={[styles.input, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
                  placeholder="Material Title"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.textArea, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
                  placeholder="What is this about?"
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.textSecondary }]}>Subject</Text>
                <View style={styles.pickerContainer}>
                  {SUBJECTS.map((s) => (
                    <TouchableOpacity 
                      key={s} 
                      style={[styles.pickerItem, subject === s && { backgroundColor: COLORS.primary }]}
                      onPress={() => setSubject(s)}
                    >
                      <Text style={[styles.pickerText, subject === s && { color: COLORS.white }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.textSecondary }]}>Type</Text>
                <View style={styles.typeContainer}>
                  {TYPES.map((t) => (
                    <TouchableOpacity 
                      key={t.id} 
                      style={[styles.typeItem, type === t.id && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                      onPress={() => setType(t.id)}
                    >
                      <Text style={[styles.typeText, type === t.id && { color: COLORS.white }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: COLORS.textSecondary }]}>Price (LKR)</Text>
                <TextInput
                  style={[styles.input, { borderColor: COLORS.border, color: COLORS.textPrimary }]}
                  placeholder="0 for free"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              {!editingMaterial && (
                <TouchableOpacity 
                  style={[styles.fileButton, { borderColor: selectedFile ? COLORS.primary : COLORS.border }]}
                  onPress={handlePickDocument}
                >
                  <Ionicons 
                    name={selectedFile ? "checkmark-circle" : "document-attach-outline"} 
                    size={24} 
                    color={selectedFile ? COLORS.primary : COLORS.textSecondary} 
                  />
                  <Text style={[styles.fileButtonText, { color: selectedFile ? COLORS.primary : COLORS.textSecondary }]}>
                    {selectedFile ? selectedFile.name : "Select PDF File"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: COLORS.primary }]}
                onPress={editingMaterial ? handleUpdate : handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? (editingMaterial ? "Updating..." : "Uploading...") : (editingMaterial ? "Update Material" : "Publish Material")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
  },
  headerSubtitle: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '900',
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 11,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  typeItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    marginBottom: 20,
  },
  fileButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 15,
  },
  iconBtn: {
    padding: 4,
  },
});
