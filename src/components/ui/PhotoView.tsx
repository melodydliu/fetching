import { Image } from 'expo-image';
import { type ImageStyle, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';

interface PhotoViewProps {
  url: string;
  style?: ViewStyle & ImageStyle;
  /** Describe the photo for screen readers, e.g. "Photo of Maya". */
  label: string;
}

/** Renders remote/local images, or a bundled tile for `placeholder://<species>` URLs. */
export function PhotoView({ url, style, label }: PhotoViewProps) {
  const { colors } = useTheme();
  if (url.startsWith('placeholder://')) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        style={[styles.tile, { backgroundColor: colors.sage }, style]}
      >
        <Icon name="paw" size={48} color={colors.onSage} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      contentFit="cover"
      transition={200}
      style={[{ backgroundColor: colors.surfaceMuted }, style]}
    />
  );
}

const styles = StyleSheet.create({ tile: { alignItems: 'center', justifyContent: 'center' } });
