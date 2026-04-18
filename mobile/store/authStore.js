import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

export const useAuthStore = create((set) => ({
    user: null,
    token: null,
    isLoading: false,
    isCheckingAuth: true,

    testConnection: async () => {
        try {
            console.log("🧪 Testing backend connection to:", `${API_URL.replace('/api', '')}/health`);
            const response = await fetch(`${API_URL.replace('/api', '')}/health`);
            const data = await response.json();
            console.log("✅ Backend is reachable:", data);
            return { success: true, data };
        } catch (error) {
            console.error("❌ Backend connection failed:", error);
            return { success: false, error: error.message };
        }
    },

    register: async (username, email, password, userData) => {
        set({ isLoading: true });

        try {
            const registerUrl = `${API_URL}/auth/register`;
            const registerData = userData || { username, email, password };

            console.log("[REGISTER] URL:", registerUrl);
            console.log("[REGISTER] Payload keys:", Object.keys(registerData || {}));

            let response;
            try {
                response = await fetch(registerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(registerData),
                });
            } catch (networkError) {
                console.log("[REGISTER] Network fetch error:", networkError);
                return {
                    success: false,
                    error: 'Network error. Please check your internet or backend server.',
                };
            }

            let rawText = '';
            try {
                rawText = await response.text();
            } catch (readError) {
                console.log("[REGISTER] Failed to read response text:", readError);
                rawText = '';
            }

            let data = {};
            if (rawText) {
                try {
                    data = JSON.parse(rawText);
                } catch (jsonError) {
                    console.log("[REGISTER] Invalid JSON response:", jsonError);
                    console.log("[REGISTER] Raw response text:", rawText);
                    data = {};
                }
            }

            if (!response.ok) {
                const backendMessage = data?.message || data?.error;
                const statusMessage = `Request failed with status ${response.status}`;
                const errorMessage = backendMessage || statusMessage;
                console.log("[REGISTER] API returned error:", errorMessage);
                return { success: false, error: errorMessage };
            }

            console.log("[REGISTER] Success response:", data);
            return { success: true, data };
        } catch (error) {
            console.log("[REGISTER] Unexpected error:", error);
            return { success: false, error: error?.message || 'Unexpected register error' };
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (email, password) => {
        set({ isLoading: true });
        try {
            const safeEmail = String(email || '').trim();
            const safePassword = String(password || '');

            if (!safeEmail || !safePassword) {
                return { success: false, error: 'Email and password are required' };
            }

            console.log("🌐 Sending login request to:", `${API_URL}/auth/login`);
            console.log("🌐 Login payload:", {
                identifier: safeEmail,
                passwordLength: safePassword.length,
            });

            let response;
            try {
                response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: safeEmail,
                        password: safePassword,
                    }),
                });
            } catch (networkError) {
                console.error("❌ Login network error:", networkError);
                return {
                    success: false,
                    error: 'Network error. Please check backend server and API URL.',
                };
            }

            let rawText = '';
            try {
                rawText = await response.text();
            } catch (readError) {
                console.error("❌ Failed to read login response:", readError);
            }

            console.log("🌐 Login response status:", response.status);
            console.log("🌐 Login raw response:", rawText || "<empty>");

            let data = {};
            if (rawText) {
                try {
                    data = JSON.parse(rawText);
                } catch (jsonError) {
                    console.error("❌ Invalid JSON from login endpoint:", jsonError);
                    console.log("[LOGIN] Raw response:", rawText);
                }
            }

            if (!response.ok) {
                const responseMessage = data?.message || data?.error || rawText || "Unknown server error";
                console.error("❌ Login failed response:", {
                    status: response.status,
                    responseMessage,
                    identifier: safeEmail,
                    passwordLength: safePassword.length,
                });
                return {
                    success: false,
                    error: `Login failed (${response.status}): ${responseMessage}`,
                };
            }

            if (!data?.token || !data?.user) {
                return { success: false, error: 'Invalid login response from server' };
            }

            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            await AsyncStorage.setItem('token', data.token);

            set({ token: data.token, user: data.user });
            return { success: true, user: data.user, token: data.token, message: data?.message, pendingApproval: Boolean(data?.pendingApproval) };
        } catch (error) {
            console.error("❌ Login error:", error);
            return { success: false, error: error?.message || 'Login failed' };
        } finally {
            set({ isLoading: false });
        }
    },

    checkAuth: async () => {
        try {
            console.log("🔍 Checking auth from storage...");
            const token = await AsyncStorage.getItem("token");
            const userJson = await AsyncStorage.getItem("user");
            const user = userJson ? JSON.parse(userJson) : null;

            if (token && user) {
                console.log("✅ Token found in storage:", token.substring(0, 20) + "...");
                set({ token, user });
            } else {
                console.log("⚠️ No token found in storage");
                set({ token: null, user: null });
            }
        } catch (error) {
            console.error("❌ Auth check failed:", error);
            set({ token: null, user: null });
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    updateProfile: async (profileData) => {
        set({ isLoading: true });
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                return { success: false, error: 'Not authenticated' };
            }

            const response = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(profileData || {}),
            });

            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                return { success: false, error: data?.message || 'Failed to update profile' };
            }

            const updatedUser = data?.user;
            if (!updatedUser) {
                return { success: false, error: 'Invalid profile response' };
            }

            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            set({ user: updatedUser });

            return { success: true, user: updatedUser };
        } catch (error) {
            return { success: false, error: error?.message || 'Failed to update profile' };
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
        set({ token: null, user: null });
    }
}));