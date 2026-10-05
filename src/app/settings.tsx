import { useMutation, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { config } from '@/config';
import { queryKeys, useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { useServices } from '@/services';

function SectionTitle({ children }: { children: string }) {
  const { spacing } = useTheme();
  return (
    <Text
      variant="smallStrong"
      color="textMuted"
      style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}
    >
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const { auth, users } = useServices();
  const queryClient = useQueryClient();
  const profile = useViewerProfile();
  const [notifications, setNotifications] = useState({
    matches: true,
    messages: true,
    likes: true,
  });

  const iconFor = (name: IconName) => <Icon name={name} color={colors.primary} />;

  const pause = useMutation({
    mutationFn: (paused: boolean) => users.setPaused(profile.data!.user.id, paused),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  /** After auth changes, drop everything tied to the old user and re-check the session. */
  const endSession = async () => {
    queryClient.setQueryData(queryKeys.session, null);
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
  };

  const logOut = useMutation({ mutationFn: () => auth.signOut(), onSuccess: endSession });
  const deleteAccount = useMutation({
    mutationFn: () => auth.deleteAccount(),
    onSuccess: endSession,
  });

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently removes your profile, matches and messages. This can’t be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteAccount.mutate() },
      ],
    );

  const toggle = (key: keyof typeof notifications, label: string) => (
    <ListRow
      key={key}
      title={label}
      chevron={false}
      trailing={
        <Switch
          value={notifications[key]}
          onValueChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel={label}
        />
      }
    />
  );

  return (
    <Screen scroll>
      <ScreenHeader title="Settings" back />

      <SectionTitle>Account</SectionTitle>
      <View style={{ gap: spacing.sm }}>
        <ListRow
          title="Phone & email"
          subtitle="Mock sign-in"
          leading={iconFor('lock')}
          onPress={() => undefined}
        />
      </View>

      <SectionTitle>Notifications</SectionTitle>
      <View style={{ gap: spacing.sm }}>
        {toggle('matches', 'New matches')}
        {toggle('messages', 'Messages')}
        {toggle('likes', 'Likes')}
      </View>

      <SectionTitle>Privacy</SectionTitle>
      <ListRow
        title="Pause my account"
        subtitle="Hide me from Discover. Matches can still chat."
        leading={iconFor('pause')}
        chevron={false}
        trailing={
          <Switch
            value={profile.data?.user.paused ?? false}
            disabled={!profile.data || pause.isPending}
            onValueChange={(v) => pause.mutate(v)}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Pause my account"
          />
        }
      />

      <SectionTitle>Session</SectionTitle>
      <View style={{ gap: spacing.sm }}>
        <ListRow title="Log out" leading={iconFor('logout')} onPress={() => logOut.mutate()} />
        <ListRow
          title="Delete account"
          tone="danger"
          leading={<Icon name="trash" color={colors.danger} />}
          onPress={confirmDelete}
        />
      </View>

      <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
        <ListRow
          title={`${config.appName} v${Constants.expoConfig?.version ?? '0.0.0'}`}
          chevron={false}
          onLongPress={config.useMocks ? () => router.push('/dev-menu') : undefined}
        />
      </View>
    </Screen>
  );
}
