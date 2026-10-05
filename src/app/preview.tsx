import { View } from 'react-native';
import { ProfileView } from '@/components/ProfileView';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';

/** Your own profile, exactly as others see it in Discover. */
export default function PreviewScreen() {
  const { spacing } = useTheme();
  const profile = useViewerProfile();
  return (
    <Screen scroll>
      <ScreenHeader title="Preview" back />
      <View style={{ gap: spacing.lg }}>
        <Chip label="This is how others see you" tone="accent" />
        {profile.data ? (
          <ProfileView profile={profile.data} />
        ) : (
          <>
            <Skeleton height={480} radius={28} />
            <Text variant="small" color="textMuted">
              Loading your profile…
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}
