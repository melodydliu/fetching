import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from '@/theme';

/** Current theme, following the system appearance. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
