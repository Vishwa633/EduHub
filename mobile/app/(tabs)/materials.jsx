import {
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  Linking,
  ScrollView,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";

const SUBJECTS = ["Mathematics", "Science", "English", "History", "ICT", "Music", "Art"];
const TYPES = [
  { id: "tute", label: "Tutes", icon: "document-text-outline" },
  { id: "book", label: "Books", icon: "book-outline" },
  { id: "quiz", label: "Quizzes", icon: "help-circle-outline" },
];

export default function StudentMaterials() {
  const { token } = useAuthStore();
  const COLORS = useColors();
  
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMaterials = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      let url = `${API_URL}/materials?`;
      if (selectedSubject) url += `subject=${encodeURIComponent(selectedSubject)}&`;
      if (selectedType) url += `type=${encodeURIComponent(selectedType)}&`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch materials");

      setMaterials(data);
    } catch (error) {
      console.error("❌ Error fetching materials:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedSubject, selectedType]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleOpenMaterial = (url) => {
    Linking.openURL(url).catch((err) => Alert.alert("Error", "Could not open PDF"));
  };

  const groupedMaterials = useMemo(() => {
    const filtered = materials.filter((m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tutor?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups = {};
    filtered.forEach((m) => {
      const tutorId = m.tutor?._id;
      if (!groups[tutorId]) {
        groups[tutorId] = {
          tutor: m.tutor,
          subjects: {},
        };
      }
      if (!groups[tutorId].subjects[m.subject]) {
        groups[tutorId].subjects[m.subject] = [];
      }
      groups[tutorId].subjects[m.subject].push(m);
    });

    // Flatten for easy rendering or use as is
    return Object.values(groups);
  }, [materials, searchQuery]);

  const renderMaterialItem = (item) => (
    <View key={item._id} style={[styles.card, { backgroundColor: COLORS.white, borderColor: COLORS.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: COLORS.primary + '15' }]}>
           <Ionicons 
             name={TYPES.find(t => t.id === item.type)?.icon || "document-outline"} 
             size={18} 
             color={COLORS.primary} 
           />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: COLORS.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.metaText, { color: COLORS.textSecondary }]}>
            {item.type.toUpperCase()} • {item.accessType}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {item.isPurchased ? (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#dcfce7', flex: 1 }]}
            onPress={() => handleOpenMaterial(item.fileUrl)}
          >
            <Ionicons name="eye-outline" size={16} color="#166534" />
            <Text style={[styles.actionText, { color: '#166534' }]}>Open PDF</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.actionButton, { backgroundColor: '#f1f5f9', flex: 1, opacity: 0.8 }]}>
            <Ionicons name="lock-closed-outline" size={16} color="#64748b" />
            <Text style={[styles.actionText, { color: '#64748b' }]}>Unlock with Session</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: COLORS.textPrimary }]}>Learning Materials</Text>
        <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
          Organized by your tutors and subjects
        </Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: COLORS.textPrimary }]}
          placeholder="Search tutor, subject or title..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        style={styles.filterScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeList}
      >
        {TYPES.map((item) => {
          const isSelected = selectedType === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.typeChip,
                isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
              ]}
              onPress={() => setSelectedType(isSelected ? null : item.id)}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={isSelected ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.typeLabel, isSelected && { color: COLORS.white }]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        style={styles.filterScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subjectList}
      >
        {SUBJECTS.map((item) => {
          const isSelected = selectedSubject === item;
          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.subjectChip,
                isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
              ]}
              onPress={() => setSelectedSubject(isSelected ? null : item)}
            >
              <Text style={[styles.subjectLabel, isSelected && { color: COLORS.white }]} numberOfLines={1}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView 
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchMaterials(true)} colors={[COLORS.primary]} />
        }
      >
        {groupedMaterials.length > 0 ? (
          groupedMaterials.map((group) => (
            <View key={group.tutor?._id} style={styles.tutorGroup}>
              <View style={styles.tutorHeader}>
                 <Image 
                   source={{ uri: group.tutor?.profileImage || "https://ui-avatars.com/api/?name=" + group.tutor?.username }} 
                   style={styles.groupAvatar} 
                 />
                 <Text style={[styles.groupTutorName, { color: COLORS.textPrimary }]}>{group.tutor?.username}</Text>
              </View>

              {Object.keys(group.subjects).map((subj) => (
                <View key={subj} style={styles.subjectGroup}>
                  <View style={styles.subjectHeader}>
                    <Ionicons name="book-outline" size={16} color={COLORS.primary} />
                    <Text style={[styles.subjectTitle, { color: COLORS.primary }]}>{subj}</Text>
                  </View>
                  <View style={styles.materialsRow}>
                    {group.subjects[subj].map((m) => renderMaterialItem(m))}
                  </View>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textSecondary} />
            <Text style={[styles.emptyText, { color: COLORS.textPrimary }]}>No materials found</Text>
            <Text style={[styles.emptySubtext, { color: COLORS.textSecondary }]}>
              Try another search or check back later
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)",
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  typeList: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 2,
    paddingBottom: 12,
    alignItems: 'center',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginRight: 10,
  },
  typeLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  subjectList: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 2,
    paddingBottom: 20,
    alignItems: 'center',
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 38,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  subjectLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.06)",
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subject: {
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '900',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  tutorGroup: {
    marginBottom: 24,
  },
  tutorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#f1f5f9',
  },
  groupAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  groupTutorName: {
    fontSize: 18,
    fontWeight: '900',
  },
  subjectGroup: {
    marginLeft: 8,
    marginBottom: 16,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  materialsRow: {
    flexDirection: 'column',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
});
