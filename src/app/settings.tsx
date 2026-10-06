import { useMutation, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Switch, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { config } from '@/config';
import type { NotificationSettings } from '@/domain/types';
import { useProfileActions } from '@/hooks/profileActions';
import { queryKeys, useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { useServices } from '@/services';
import { confirmAction } from '@/utils/confirm';

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
  const { updateUser } = useProfileActions();

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
    confirmAction({
      title: 'Delete your account?',
      message: 'This permanently removes your profile, matches and messages. This can’t be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep my account',
      destructive: true,
      onConfirm: () => deleteAccount.mutate(),
    });

  const notifications = profile.data?.user.notifications;
  const toggle = (key: keyof NotificationSettings, label: string) => (
    <ListRow
      key={key}
      title={label}
      chevron={false}
      trailing={
        <Switch
          value={notifications?.[key] ?? true}
          disabled={!notifications}
          onValueChange={(v) => void updateUser({ notifications: { ...notifications!, [key]: v } })}
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
          title="Account"
          subtitle="Sign-in, member since"
          onPress={() => router.push('/account')}
          leading={iconFor('lock')}
        />
      </View>

      <SectionTitle>Notifications</SectionTitle>
      <View style={{ gap: spacing.sm }}>
        {toggle('matches', 'New matches')}
        {toggle('messages', 'Messages')}
        {toggle('likes', 'Likes')}
        {toggle('playDates', 'Play Dates')}
      </View>

      <SectionTitle>Privacy</SectionTitle>
      <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
        <ListRow
          title="Blocked people"
          subtitle="See and undo who you've blocked"
          leading={iconFor('shield')}
          onPress={() => router.push('/blocked')}
        />
      </View>
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
