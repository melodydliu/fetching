import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { config } from '@/config';
import { useServices } from '@/services';

type Method = 'phone' | 'email';

/** Mocked phone/email sign-in. Any value works; the "code" is any 6 digits. */
export default function SignInScreen() {
  const { spacing } = useTheme();
  const { auth } = useServices();
  const queryClient = useQueryClient();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const signingUp = mode !== 'login';

  const [method, setMethod] = useState<Method>('phone');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const valid =
    method === 'phone'
      ? value.replace(/\D/g, '').length >= 10
      : /^\S+@\S+\.\S+$/.test(value.trim());

  const submit = useMutation({
    mutationFn: () => {
      const credentials = method === 'phone' ? { phone: value.trim() } : { email: value.trim() };
      return signingUp ? auth.signUp(credentials) : auth.signIn(credentials);
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <Screen scroll noTopInset>
      <ScreenHeader title={signingUp ? 'Create your account' : 'Welcome back'} back />
      <View style={{ gap: spacing.xl }}>
        {!codeSent ? (
          <>
            <ChoiceChips
              label="Sign in with"
              options={[
                { value: 'phone', label: 'Phone' },
                { value: 'email', label: 'Email' },
              ]}
              value={[method]}
              onChange={([m]) => {
                setMethod(m as Method);
                setValue('');
              }}
            />
            <TextField
              label={method === 'phone' ? 'Phone number' : 'Email address'}
              value={value}
              onChangeText={setValue}
              keyboardType={method === 'phone' ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              autoComplete={method === 'phone' ? 'tel' : 'email'}
              autoFocus
              hint={
                !signingUp && config.useMocks
                  ? `Mock sign-in. Demo account: ${config.demoAccountEmail}`
                  : 'Mock sign-in: nothing is actually sent.'
              }
            />
            <Button label="Send code" disabled={!valid} onPress={() => setCodeSent(true)} />
          </>
        ) : (
          <>
            <Text variant="body" color="textMuted">
              Enter any 6 digits to continue (mock verification).
            </Text>
            <TextField
              label="6-digit code"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={{ letterSpacing: 8, textAlign: 'center' }}
            />
            {submit.isError && (
              <Text variant="small" color="danger" accessibilityLiveRegion="polite">
                {submit.error.message}
              </Text>
            )}
            <Button
              label={signingUp ? 'Create account' : 'Log in'}
              disabled={code.length !== 6}
              loading={submit.isPending}
              onPress={() => submit.mutate()}
            />
            <Button
              label="Use a different number or email"
              variant="ghost"
              onPress={() => setCodeSent(false)}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
