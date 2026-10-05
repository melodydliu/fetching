import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { ColorTokens, TypographyVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: keyof ColorTokens;
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      accessibilityRole={
        rest.accessibilityRole ??
        (variant === 'display' || variant === 'title' ? 'header' : undefined)
      }
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
