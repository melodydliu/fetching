import { View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { useViewerProfile } from '@/hooks/queries';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

export default function OnboardingScreen() {
  const profile = useViewerProfile();
  if (!profile.data) {
    return (
      <View style={{ flex: 1, padding: 24, paddingTop: 80 }}>
        <Skeleton height={40} />
      </View>
    );
  }
  return <OnboardingFlow profile={profile.data} />;
}
