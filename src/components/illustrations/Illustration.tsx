import { Image } from 'expo-image';

/**
 * Our own illustrations (transparent PNGs in assets/illustrations/). Screens ask for one by
 * name; each name is the screen it belongs to, so art can be redrawn or shared between screens
 * by changing one line here. Width and height are the file's pixel size (keeps its aspect ratio).
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

interface Props {
  name: IllustrationName;
  /** Rendered width in points; height follows the picture's aspect ratio. */
  width?: number;
}

export function Illustration({ name, width = 240 }: Props) {
  const { source, width: w, height: h } = ILLUSTRATIONS[name];
  return (
    <Image
      source={source}
      contentFit="contain"
      accessible={false}
      style={{ width, aspectRatio: w / h }}
    />
  );
}
