import { useThemeStore } from '../store/themeStore';
import { THEMES } from '../constants/colors';

export const useColors = () => {
  const colors = useThemeStore((state) => state.colors);
  return colors || THEMES.blossom.colors;
};
