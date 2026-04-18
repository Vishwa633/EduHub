import { View, ActivityIndicator } from "react-native";
import { useColors } from "../hooks/useColors";

export default function Loader({ size = "large" }) {
  const COLORS = useColors();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
      }}
    >
      <ActivityIndicator size={size} color={COLORS.primary} />
    </View>
  );
}