import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabButton } from '@/components/TabButton';
import { useIncomingLikes, useMatches } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';

/**
 * Headless tabs with a floating pill bar. The active tab expands into a
 * labelled berry capsule; inactive tabs stay icon-only (and screen-reader labelled).
 */
export default function TabsLayout() {
  const { colors, radii, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const likes = useIncomingLikes();
  const matches = useMatches();
  const yourTurn = matches.data?.filter((m) => m.yourTurn).length ?? 0;

  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={[
          styles.bar,
          shadows.floating,
          {
            bottom: Math.max(insets.bottom, 12),
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.pill,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon="paw" label="Discover" />
        </TabTrigger>
        <TabTrigger name="likes" href="/likes" asChild>
          <TabButton icon="heart" label="Likes You" badge={likes.data?.length} />
        </TabTrigger>
        <TabTrigger name="matches" href="/matches" asChild>
          <TabButton icon="chat" label="Matches" badge={yourTurn} />
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton icon="user" label="Profile" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
