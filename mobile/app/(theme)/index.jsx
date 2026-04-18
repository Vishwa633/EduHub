import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { THEMES } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

export default function ThemeSelection() {
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const [selectedTheme, setSelectedTheme] = useState(theme);

  // Sync selectedTheme with store theme
  useEffect(() => {
    setSelectedTheme(theme);
  }, [theme]);

  const handleThemeSelect = async (themeKey) => {
    if (selectedTheme !== themeKey) {
      setSelectedTheme(themeKey);
    }
    await setTheme(themeKey);
  };

  const handleGetStarted = () => {
    router.replace('/(auth)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 36, fontWeight: '700', fontFamily: 'monospace', marginBottom: 10 }}>
            EduHub 🎓
          </Text>
          <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 10 }}>
            Choose Your Theme
          </Text>
          <Text style={{ fontSize: 14, color: '#999', textAlign: 'center' }}>
            Personalize your reading experience
          </Text>
        </View>

        {/* Theme Cards */}
        <View style={{ gap: 16 }}>
          {Object.entries(THEMES).map(([key, { name, colors }]) => (
            <TouchableOpacity
              key={key}
              onPress={() => handleThemeSelect(key)}
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: 16,
                padding: 20,
                borderWidth: 3,
                borderColor: selectedTheme === key ? colors.primary : colors.border,
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 8 }}>
                    {name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.primary,
                      }}
                    />
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.textPrimary,
                      }}
                    />
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    />
                  </View>
                </View>
                {selectedTheme === key && (
                  <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          onPress={handleGetStarted}
          style={{
            backgroundColor: THEMES[selectedTheme || 'blossom'].colors.primary,
            borderRadius: 12,
            paddingVertical: 16,
            marginTop: 40,
            shadowColor: THEMES[selectedTheme || 'blossom'].colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#fff',
              textAlign: 'center',
            }}
          >
            Get Started
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
