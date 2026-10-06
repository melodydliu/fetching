import { View } from 'react-native';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useViewerProfile } from '@/hooks/queries';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

export default function OnboardingScreen() {
  const profile = useViewerProfile();
  if (!profile.data) {
    return (
      <View style={{ flex: 1, padding: 24, paddingTop: 80 }}>
        {profile.isError ? (
          <ErrorState onRetry={() => void profile.refetch()} />
        ) : (
          <Skeleton height={40} />
        )}
      </View>
    );
  }
  return <OnboardingFlow profile={profile.data} />;
}
