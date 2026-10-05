import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

export type SpotName = 'tennis-ball' | 'heart-leash' | 'speech-paws' | 'bowl';

interface Props {
  name: SpotName;
  size?: number;
}

/**
 * Original spot illustrations: one ink line weight over theme-colored fills,
 * sitting on an organic pebble shape. Placeholders for commissioned art.
 */
export function SpotIllustration({ name, size = 220 }: Props) {
  const { colors } = useTheme();
  const ink = colors.text;
  const line = {
    stroke: ink,
    strokeWidth: 3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  const backdrop =
    name === 'tennis-ball'
      ? colors.sage
      : name === 'heart-leash'
        ? colors.primarySoft
        : colors.surfaceMuted;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      {/* pebble backdrop */}
      <Path
        d="M38 98C30 58 62 28 102 30c40 2 72 24 70 64-2 38-28 72-70 74-40 2-56-30-64-70z"
        fill={backdrop}
      />
      {name === 'tennis-ball' && (
        <G>
          <Ellipse cx="100" cy="162" rx="40" ry="7" fill={ink} opacity={0.12} />
          <Circle cx="100" cy="104" r="50" fill={colors.accent} {...line} />
          <Path d="M62 72c26 18 26 46 0 64" fill="none" {...line} />
          <Path d="M138 72c-26 18-26 46 0 64" fill="none" {...line} />
          <Path
            d="M158 44l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM40 52l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
            fill={ink}
          />
        </G>
      )}
      {name === 'heart-leash' && (
        <G>
          <Path
            d="M100 156C46 122 44 76 76 66c16-5 24 6 24 14 0-8 8-19 24-14 32 10 30 56-24 90z"
            fill={colors.primary}
            {...line}
          />
          <Path d="M124 68c14-30 44-34 48-12 3 16-14 18-18 6" fill="none" {...line} />
          <Circle cx="154" cy="60" r="3" fill={ink} />
          <Path
            d="M72 88c2-8 8-12 14-12"
            fill="none"
            stroke="#fff"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.6}
          />
        </G>
      )}
      {name === 'speech-paws' && (
        <G>
          <Path
            d="M40 62a16 16 0 0 1 16-16h66a16 16 0 0 1 16 16v38a16 16 0 0 1-16 16H80l-20 18v-18h-4a16 16 0 0 1-16-16z"
            fill={colors.sage}
            {...line}
          />
          <Path
            d="M96 108a14 14 0 0 1 14-14h40a14 14 0 0 1 14 14v28a14 14 0 0 1-14 14h-2v14l-16-14h-22a14 14 0 0 1-14-14z"
            fill={colors.accent}
            {...line}
          />
          <G fill={ink}>
            <Ellipse cx="116" cy="114" rx="3.4" ry="4.2" />
            <Ellipse cx="125" cy="108" rx="3.4" ry="4.4" />
            <Ellipse cx="135" cy="108" rx="3.4" ry="4.4" />
            <Ellipse cx="144" cy="114" rx="3.2" ry="4" />
            <Path d="M130 117c6 0 11 5 11 9 0 3-3 4-6 3-3-1-3-1-5-1s-2 0-5 1c-3 1-6 0-6-3 0-4 5-9 11-9z" />
          </G>
          <Circle cx="64" cy="82" r="3" fill={ink} />
          <Circle cx="80" cy="82" r="3" fill={ink} />
          <Circle cx="96" cy="82" r="3" fill={ink} />
        </G>
      )}
      {name === 'bowl' && (
        <G>
          <Ellipse cx="100" cy="164" rx="52" ry="7" fill={ink} opacity={0.12} />
          <Path d="M44 108h112c0 34-24 54-56 54s-56-20-56-54z" fill={colors.primary} {...line} />
          <Ellipse cx="100" cy="108" rx="56" ry="11" fill={colors.primarySoft} {...line} />
          <Path
            d="M80 138c8 6 32 6 40 0"
            fill="none"
            stroke="#fff"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.55}
          />
          <Rect
            x="92"
            y="58"
            width="16"
            height="16"
            rx="5"
            fill={colors.accent}
            {...line}
            transform="rotate(-12 100 66)"
          />
          <Path d="M146 56h14l-14 14h14" fill="none" {...line} />
        </G>
      )}
    </Svg>
  );
}
