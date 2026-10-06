import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileView } from '@/components/ProfileView';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';

/** Your own profile, exactly as others see it in Discover. */
export default function PreviewScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useViewerProfile();
  const gutter = { paddingHorizontal: spacing.lg };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
    >
      <View style={[gutter, { paddingTop: insets.top + spacing.md, gap: spacing.lg }]}>
        <ScreenHeader title="Preview" back />
        <Chip label="This is how your profile looks to other users" tone="accent" />
      </View>
      {profile.data ? (
        <View style={{ marginTop: spacing.lg }}>
          {/* The photo sits below the header here, so there's no status bar to shade. */}
          <ProfileView profile={profile.data} statusBarScrim={false} />
        </View>
      ) : profile.isError ? (
        <View style={gutter}>
          <ErrorState onRetry={() => void profile.refetch()} />
        </View>
      ) : (
        <View style={[gutter, { gap: spacing.lg }]}>
          <Skeleton height={480} radius={28} />
          <Text variant="small" color="textMuted">
            Loading your profile…
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
