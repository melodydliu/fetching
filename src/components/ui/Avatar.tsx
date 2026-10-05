import { View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { PhotoView } from './PhotoView';

export function Avatar({ url, name, size = 56 }: { url: string; name: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.surface,
      }}
    >
      <PhotoView url={url} label={`Photo of ${name}`} style={{ width: size, height: size }} />
    </View>
  );
}
