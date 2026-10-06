import { type ColorTokens, darkColors, lightColors } from '../index';

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Text/background pairs the UI really uses; each must reach 4.5:1 (normal text). */
const PAIRS: [keyof ColorTokens, keyof ColorTokens][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceMuted'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textSubtle', 'background'],
  ['textSubtle', 'surface'],
  ['onPrimary', 'primary'],
  ['onPrimarySoft', 'primarySoft'],
  ['onAccent', 'accent'],
  ['onSage', 'sage'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['danger', 'background'],
  ['danger', 'surface'],
  ['sageStrong', 'background'],
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s theme contrast', (_name, colors) => {
  it.each(PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
