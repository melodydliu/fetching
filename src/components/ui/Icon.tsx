import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

export type IconName =
  | 'paw'
  | 'heart'
  | 'chat'
  | 'user'
  | 'x'
  | 'chevron-right'
  | 'chevron-left'
  | 'sliders'
  | 'bell'
  | 'shield'
  | 'pause'
  | 'logout'
  | 'trash'
  | 'star'
  | 'pin'
  | 'lock'
  | 'send'
  | 'check'
  | 'plus'
  | 'edit'
  | 'eye'
  | 'alert'
  | 'briefcase'
  | 'compass'
  | 'calendar'
  | 'cards'
  | 'home';

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  filled?: boolean;
}

/** Our own 24px line-icon set. Decorative: callers label the pressable, not the icon. */
export function Icon({ name, size = 24, color, filled = false }: IconProps) {
  const fill = filled ? color : 'none';
  const stroke = {
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {name === 'paw' && (
        <>
          <Ellipse cx="7" cy="9.5" rx="1.9" ry="2.4" fill={color} />
          <Ellipse cx="11" cy="6" rx="1.9" ry="2.5" fill={color} />
          <Ellipse cx="15.5" cy="6.5" rx="1.9" ry="2.5" fill={color} />
          <Ellipse cx="18.5" cy="10.5" rx="1.8" ry="2.3" fill={color} />
          <Path
            d="M12.6 12.2c2.6 0 5.2 3 5.2 5.3 0 1.7-1.6 2.5-3.1 2.1-1.2-.3-1.4-.6-2.3-.6s-1.1.3-2.3.6c-1.5.4-3.1-.4-3.1-2.1 0-2.3 2.9-5.3 5.6-5.3z"
            fill={color}
          />
        </>
      )}
      {name === 'heart' && (
        <Path
          d="M12 20s-7.5-4.5-7.5-10.1A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.5C19.5 15.5 12 20 12 20z"
          fill={fill}
          {...stroke}
        />
      )}
      {name === 'chat' && (
        <Path
          d="M4.5 7A2.5 2.5 0 0 1 7 4.5h10A2.5 2.5 0 0 1 19.5 7v7A2.5 2.5 0 0 1 17 16.5h-5.5L7.5 20v-3.5H7A2.5 2.5 0 0 1 4.5 14z"
          fill={fill}
          {...stroke}
        />
      )}
      {name === 'user' && (
        <>
          <Circle cx="12" cy="8.5" r="3.6" fill={fill} {...stroke} />
          <Path d="M5 20c.4-3.6 3.2-5.6 7-5.6s6.6 2 7 5.6" {...stroke} />
        </>
      )}
      {name === 'x' && <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...stroke} />}
      {name === 'chevron-right' && <Path d="M9.5 5.5l6.5 6.5-6.5 6.5" {...stroke} />}
      {name === 'chevron-left' && <Path d="M14.5 5.5L8 12l6.5 6.5" {...stroke} />}
      {name === 'sliders' && (
        <>
          <Path d="M4 8h9M17 8h3M4 16h3M11 16h9" {...stroke} />
          <Circle cx="15" cy="8" r="2" {...stroke} />
          <Circle cx="9" cy="16" r="2" {...stroke} />
        </>
      )}
      {name === 'bell' && (
        <Path
          d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5zM10 20.5a2 2 0 0 0 4 0"
          {...stroke}
        />
      )}
      {name === 'shield' && (
        <Path
          d="M12 3.5l7 2.5v5.5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z"
          fill={fill}
          {...stroke}
        />
      )}
      {name === 'pause' && <Path d="M9 6v12M15 6v12" {...stroke} strokeWidth={2.6} />}
      {name === 'logout' && (
        <Path
          d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10M15 8l4 4-4 4M19 12H9.5"
          {...stroke}
        />
      )}
      {name === 'trash' && (
        <Path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7M10.5 11v5M13.5 11v5" {...stroke} />
      )}
      {name === 'star' && (
        <Path
          d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8 6.9 19.5l1-5.7-4.1-4 5.7-.8z"
          fill={fill}
          {...stroke}
        />
      )}
      {name === 'pin' && (
        <>
          <Path d="M12 20.5s6-5.4 6-10.2a6 6 0 0 0-12 0c0 4.8 6 10.2 6 10.2z" {...stroke} />
          <Circle cx="12" cy="10.2" r="2.1" {...stroke} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Path d="M6.5 11h11v8.5h-11zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" {...stroke} />
        </>
      )}
      {name === 'check' && <Path d="M5.5 12.5l4.2 4.2L18.5 7.8" {...stroke} strokeWidth={2.6} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...stroke} strokeWidth={2.4} />}
      {name === 'edit' && (
        <Path
          d="M5 19l1-4.2L16.6 4.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L9.2 18zM14.5 6.3l3.2 3.2"
          {...stroke}
        />
      )}
      {name === 'eye' && (
        <>
          <Path
            d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
            {...stroke}
          />
          <Circle cx="12" cy="12" r="2.8" {...stroke} />
        </>
      )}
      {name === 'alert' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Path d="M12 7.8v5M12 16.2v.1" {...stroke} strokeWidth={2.4} />
        </>
      )}
      {name === 'briefcase' && <Path d="M4.5 8.5h15v10h-15zM9 8.5V6h6v2.5M4.5 13h15" {...stroke} />}
      {name === 'compass' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5z" {...stroke} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Path
            d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"
            {...stroke}
          />
          <Path d="M3.5 10h17M8 3.5v4M16 3.5v4" {...stroke} />
        </>
      )}
      {name === 'cards' && (
        <>
          <Path d="M7.5 6.2l7-1.9a1.5 1.5 0 0 1 1.8 1.1l2.9 10.6" {...stroke} />
          <Path
            d="M6.5 8.5h8a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 19v-9a1.5 1.5 0 0 1 1.5-1.5z"
            {...stroke}
          />
        </>
      )}
      {name === 'home' && (
        <>
          <Path d="M4 11l8-6.5 8 6.5" {...stroke} />
          <Path d="M6 9.8V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.8" {...stroke} />
        </>
      )}
      {name === 'send' && <Path d="M4 11.5L20 4l-5.5 16-3-6.5z" fill={fill} {...stroke} />}
    </Svg>
  );
}
