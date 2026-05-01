import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';

export default function TabLayout() {
  const COLORS = useColors();
  const { user } = useAuthStore();
    const insets = useSafeAreaInsets();
    const bottomInset = Number.isFinite(insets?.bottom) ? insets.bottom : 0;
    const isTutor = user?.role === 'tutor';

  return (
        <Tabs
            initialRouteName="index"
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '700',
                    marginBottom: 2,
                },
                tabBarItemStyle: {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                tabBarStyle: {
                    display: 'flex',
                    elevation: 20,
                    backgroundColor: COLORS.cardBackground,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                    paddingTop: 5,
                    paddingBottom: Math.max(bottomInset, 8),
                    minHeight: 64,
                    height: 72 + bottomInset,
                },
            }}
    >

            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='home-outline' size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="create"
                options={{
                    title: 'Sessions',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='calendar-outline' size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="payments"
                options={{
                    title: 'Payments',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='cash-outline' size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="materials"
                options={{
                    title: 'Materials',
                    href: isTutor ? null : undefined,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='library-outline' size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="inquiries"
                options={{
                    title: 'Help',
                    href: isTutor ? null : undefined,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='help-circle-outline' size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='chatbubble-ellipses-outline' size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="edubot"
                options={{
                    title: 'EduBot',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='bulb-outline' size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name='person-outline' size={size} color={color} />
                    ),
                }}
            />


            {/* The following hidden screens are not shown in the bottom bar */}
            <Tabs.Screen name="tutor/[id]" options={{ href: null }} />
            <Tabs.Screen name="subject/[name]" options={{ href: null }} />
            <Tabs.Screen name="edit-profile" options={{ href: null }} />
            <Tabs.Screen name="book-session" options={{ href: null }} />
            <Tabs.Screen name="booking-payment" options={{ href: null }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
            <Tabs.Screen name="payment-success" options={{ href: null }} />
            <Tabs.Screen name="favourites" options={{ href: null }} />
            <Tabs.Screen name="admin-disputes" options={{ href: null }} />
            <Tabs.Screen name="tutor/reviews" options={{ href: null }} />

        </Tabs>
  );
}