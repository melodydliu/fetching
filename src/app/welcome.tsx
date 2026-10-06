import { router } from 'expo-router';
import { View } from 'react-native';
import { Illustration } from '@/components/illustrations/Illustration';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { config } from '@/config';
import { useTheme } from '@/hooks/useTheme';

export default function WelcomeScreen() {
  const { spacing } = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <Illustration name="welcome" width={280} />
        <Text variant="display" align="center">
          Your next best walk
        </Text>
        <Text variant="displayItalic" color="primary" align="center">
          starts here
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {config.appName} is dating for people whose pets are family.
        </Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button
          label="Get started"
          onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'signup' } })}
        />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'login' } })}
        />
      </View>
    </Screen>
  );
}
