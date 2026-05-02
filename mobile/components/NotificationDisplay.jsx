import { useState, useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';

export default function NotificationDisplay({ notification, onDismiss }) {
  const COLORS = useColors();
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onDismiss?.();
      });
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginVertical: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
    },
    success: {
      backgroundColor: '#dcfce7',
      borderColor: '#86efac',
    },
    error: {
      backgroundColor: '#fee2e2',
      borderColor: '#fca5a5',
    },
    info: {
      backgroundColor: '#e0f2fe',
      borderColor: '#7dd3fc',
    },
    text: {
      flex: 1,
      fontWeight: '600',
      fontSize: 13,
    },
    successText: {
      color: '#166534',
    },
    errorText: {
      color: '#991b1b',
    },
    infoText: {
      color: '#0c4a6e',
    },
  }), []);

  const typeStyles = {
    success: { container: styles.success, text: styles.successText, icon: 'checkmark-circle' },
    error: { container: styles.error, text: styles.errorText, icon: 'close-circle' },
    info: { container: styles.info, text: styles.infoText, icon: 'information-circle' },
  };

  const type = notification?.type || 'info';
  const config = typeStyles[type] || typeStyles.info;

  return (
    <Animated.View style={[{ opacity: fadeAnim }]}>
      <View style={[styles.container, config.container]}>
        <Ionicons name={config.icon} size={20} color={config.text.color} />
        <Text style={[styles.text, config.text]} numberOfLines={2}>
          {notification?.message}
        </Text>
      </View>
    </Animated.View>
  );
}
