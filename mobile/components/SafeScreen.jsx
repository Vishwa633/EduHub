import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../hooks/useColors';

export default function SafeScreen({ children }) {
  const insets = useSafeAreaInsets();
  const COLORS = useColors();

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: COLORS.background }}>{children}</View>
  );
}