import { View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { ColorTokens } from '@/theme';
import { Text } from './Text';

interface ChipProps {
  label: string;
  tone?: 'neutral' | 'primary' | 'sage' | 'accent';
}

const TONES: Record<
  NonNullable<ChipProps['tone']>,
  { bg: keyof ColorTokens; fg: keyof ColorTokens }
> = {
  neutral: { bg: 'surfaceMuted', fg: 'text' },
  primary: { bg: 'primarySoft', fg: 'onPrimarySoft' },
  sage: { bg: 'sage', fg: 'onSage' },
  accent: { bg: 'accent', fg: 'onAccent' },
};

export function Chip({ label, tone = 'neutral' }: ChipProps) {
  const { colors, radii, spacing } = useTheme();
  const t = TONES[tone];
  return (
    <View
      style={{
        backgroundColor: colors[t.bg],
        borderRadius: radii.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 1,
        alignSelf: 'flex-start',
      }}
    >
      <Text variant="caption" style={{ color: colors[t.fg] }}>
        {label}
      </Text>
    </View>
  );
}
