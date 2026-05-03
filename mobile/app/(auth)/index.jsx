import { View, Text, Image, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useState } from 'react';
import { useColors } from '../../hooks/useColors';
import { useThemeStore } from '../../store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';

import { useAuthStore } from '../../store/authStore';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const COLORS = useColors();
  const theme = useThemeStore((state) => state.theme);
  const router = useRouter();

  // Map theme to image
  const themeImages = {
    forest: require("../../assets/images/green.png"),
    retro: require("../../assets/images/brown.png"),
    ocean: require("../../assets/images/blue.png"),
    blossom: require("../../assets/images/pink.png"),
  };

  const loginImage = themeImages[theme] || themeImages.blossom;

  const handleLogin = async () => {
    const result = await login(email, password);

    if(!result.success) {
      Alert.alert("Error", result.error);
      return;
    }

    if (result.pendingApproval) {
      Alert.alert("Pending Approval", result.message || "Your tutor account is waiting for admin approval.");
    }

    const role = String(result?.user?.role || "");
    if (role === "admin") {
      router.replace("/(admin)");
      return;
    }

    router.replace("/(tabs)");
  }


  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 20, justifyContent: "center" }}>
      <View style={{ alignItems: "center", width: "100%" }}>
        <Image
            source={loginImage}
            style={{ width: "75%", height: 250 }}
            resizeMode="contain"
        />
      </View>

      <View style={{ 
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 24,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 2,
        borderColor: COLORS.border,
        marginTop: -24,
      }}>
            <View style={{ marginBottom: 16 }}>
                {/* Email */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, marginBottom: 8, color: COLORS.textPrimary, fontWeight: "500" }}>Email</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 }}>
                    <Ionicons
                        name="mail-outline"
                        size={20}
                        color={COLORS.primary}
                        style={{ marginRight: 10 }}
                    />   
                    <TextInput
                        style={{ flex: 1, height: 48, fontSize: 16, color: COLORS.textDark }}
                        placeholder="email@address.com"
                        placeholderTextColor={COLORS.placeholderText}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    </View>
                </View> 

                {/* PASSWORD */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 14, marginBottom: 8, color: COLORS.textPrimary, fontWeight: "500" }}>Password</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: COLORS.inputBackground, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 }}>
                    <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={COLORS.primary}
                        style={{ marginRight: 10 }}
                    />   
                    <TextInput
                        style={{ flex: 1, height: 48, fontSize: 16, color: COLORS.textDark }}
                        placeholder="••••••••"
                        placeholderTextColor={COLORS.placeholderText}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                    />
                    
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Ionicons
                            name={showPassword ? "eye-outline" : "eye-off-outline"}
                            size={20}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity 
                  style={{ backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 12, marginVertical: 16 }} 
                  onPress={handleLogin} 
                  disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.white, textAlign: "center" }}>Login</Text>
                    )}
                </TouchableOpacity>


                {/* FOOTER */}
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16 }}>
                  <Text style={{ color: COLORS.textSecondary }}>Don&apos;t have an account?</Text>
                    <Link href="/signup" asChild>
                        <TouchableOpacity>
                            <Text style={{ color: COLORS.primary, fontWeight: "600", marginLeft: 4 }}>Sign Up</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    </View>
  );
}