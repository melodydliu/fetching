import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { config } from '@/config';
import { useTheme } from '@/hooks/useTheme';
import { useServices } from '@/services';

/** Email + password sign-in. (Phone and emailed codes come later: they need SMS / custom SMTP.) */
export default function SignInScreen() {
  const { spacing } = useTheme();
  const { auth } = useServices();
  const queryClient = useQueryClient();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const signingUp = mode !== 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordValid = password.length >= (signingUp ? config.minPasswordLength : 1);

  const submit = useMutation({
    mutationFn: () => {
      const credentials = { email: email.trim(), password };
      return signingUp ? auth.signUp(credentials) : auth.signIn(credentials);
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <Screen scroll>
      <ScreenHeader title={signingUp ? 'Create your account' : 'Welcome back'} back />
      <View style={{ gap: spacing.xl }}>
        <TextField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
          hint={
            !signingUp && config.useMocks
              ? `Demo mode: log in as ${config.demoAccountEmail} with any password.`
              : undefined
          }
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={signingUp ? 'new-password' : 'current-password'}
          textContentType={signingUp ? 'newPassword' : 'password'}
          returnKeyType="go"
          onSubmitEditing={() => emailValid && passwordValid && submit.mutate()}
          hint={signingUp ? `At least ${config.minPasswordLength} characters.` : undefined}
        />
        {submit.isError && (
          <Text variant="small" color="danger" accessibilityLiveRegion="polite">
            {submit.error.message}
          </Text>
        )}
        <Button
          label={signingUp ? 'Create account' : 'Log in'}
          disabled={!emailValid || !passwordValid}
          loading={submit.isPending}
          onPress={() => submit.mutate()}
        />
      </View>
    </Screen>
  );
}
