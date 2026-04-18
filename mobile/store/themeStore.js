import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES } from '../constants/colors';

export const useThemeStore = create((set, get) => ({
    theme: 'blossom', // default theme
    colors: THEMES.blossom.colors,
    isThemeLoaded: false,

    setTheme: async (themeKey) => {
        try {
            if (THEMES[themeKey]) {
                const themeColors = THEMES[themeKey].colors;
                const currentState = get();

                if (currentState.theme === themeKey && currentState.colors === themeColors && currentState.isThemeLoaded) {
                    return;
                }

                set({
                    theme: themeKey,
                    colors: themeColors,
                    isThemeLoaded: true,
                });

                await AsyncStorage.setItem('selectedTheme', themeKey);
            } else {
                console.error("❌ [STORE] Invalid theme:", themeKey);
            }
        } catch (error) {
            console.error("❌ [STORE] Error setting theme:", error);
        }
    },

    checkTheme: async () => {
        try {
            if (get().isThemeLoaded) {
                return;
            }

            const savedTheme = await AsyncStorage.getItem('selectedTheme');
            
            if (savedTheme && THEMES[savedTheme]) {
                const nextColors = THEMES[savedTheme].colors;
                const currentState = get();

                if (currentState.theme !== savedTheme || currentState.colors !== nextColors || !currentState.isThemeLoaded) {
                    set({
                        theme: savedTheme,
                        colors: nextColors,
                        isThemeLoaded: true,
                    });
                }
            } else {
                const currentState = get();
                if (currentState.theme !== 'blossom' || currentState.colors !== THEMES.blossom.colors || !currentState.isThemeLoaded) {
                    set({ 
                        theme: 'blossom', 
                        colors: THEMES.blossom.colors,
                        isThemeLoaded: true,
                    });
                }
            }
        } catch (error) {
            console.error("❌ [STORE] Error checking theme:", error);
            if (!get().isThemeLoaded) {
                set({ isThemeLoaded: true });
            }
        }
    },
}));
