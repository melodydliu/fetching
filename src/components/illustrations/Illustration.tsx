import { Image } from 'expo-image';

/**
 * Our own illustrations (transparent PNGs in assets/illustrations/). Screens ask for one by
 * name; each name is the screen it belongs to, so art can be redrawn or shared between screens
 * by changing one line here. Width and height are the file's pixel size.
 */
const ILLUSTRATIONS = {
  'empty-blocked': {
    source: require('../../../assets/illustrations/empty-blocked.png'),
    width: 960,
    height: 937,
  },
  'empty-chat-thread': {
    source: require('../../../assets/illustrations/empty-chat-thread.png'),
    width: 960,
    height: 804,
  },
  'empty-discover-no-one-nearby': {
    source: require('../../../assets/illustrations/empty-discover-no-one-nearby.png'),
    width: 960,
    height: 778,
  },
  'empty-discover-out-of-likes': {
    source: require('../../../assets/illustrations/empty-discover-out-of-likes.png'),
    width: 960,
    height: 778,
  },
  'empty-likes-you': {
    source: require('../../../assets/illustrations/empty-likes-you.png'),
    width: 830,
    height: 960,
  },
  'empty-match-gone': {
    source: require('../../../assets/illustrations/empty-match-gone.png'),
    width: 960,
    height: 715,
  },
  'empty-matches': {
    source: require('../../../assets/illustrations/empty-matches.png'),
    width: 960,
    height: 623,
  },
  'error-load-failed': {
    source: require('../../../assets/illustrations/error-load-failed.png'),
    width: 960,
    height: 666,
  },
  'onboarding-finish': {
    source: require('../../../assets/illustrations/onboarding-finish.png'),
    width: 905,
    height: 960,
  },
  'onboarding-location': {
    source: require('../../../assets/illustrations/onboarding-location.png'),
    width: 960,
    height: 723,
  },
  welcome: {
    source: require('../../../assets/illustrations/welcome.png'),
    width: 960,
    height: 884,
  },
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

/** Same visual size for every picture: about 240 x 190 points of artwork, whatever its shape. */
const DEFAULT_AREA = 240 * 190;
const MAX_WIDTH = 300;

interface Props {
  name: IllustrationName;
  /**
   * How much room the picture takes up, in square points. Sizing by area (not width) keeps tall
   * and wide pictures looking equally big. Use the default unless a screen needs a hero.
   */
  area?: number;
}

export function Illustration({ name, area = DEFAULT_AREA }: Props) {
  const { source, width: w, height: h } = ILLUSTRATIONS[name];
  const ratio = w / h;
  const width = Math.min(MAX_WIDTH, Math.sqrt(area * ratio));
  return (
    <Image
      source={source}
      contentFit="contain"
      accessible={false}
      style={{ width, aspectRatio: ratio }}
    />
  );
}
