import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { PhotoView } from '@/components/ui/PhotoView';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { SPECIES_LABELS } from '@/config/reference';
import { ageFromBirthdate } from '@/domain/geo';
import { profileCompleteness } from '@/domain/onboarding';
import { useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';

export default function ProfileScreen() {
  const { colors, radii, spacing } = useTheme();
  const profile = useViewerProfile();

  /** Each checklist item jumps to the place where it gets done. */
  const openItem = (key: string) => {
    const firstPet = profile.data?.pets[0];
    if (key === 'pets') {
      router.push({ pathname: '/pet/[id]', params: { id: firstPet?.id ?? 'new' } });
    } else {
      router.push('/edit-profile');
    }
  };

  return (
    <Screen tabbed scroll>
      <Text variant="titleItalic" style={{ marginBottom: spacing.lg }}>
        Profile
      </Text>
      {profile.isPending ? (
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <Skeleton width={120} height={120} radius={60} />
          <Skeleton width={180} height={28} />
        </View>
      ) : profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : (
        (() => {
          const { user, pets } = profile.data;
          const { score, items } = profileCompleteness(profile.data);
          const todo = items.filter((i) => !i.done);
          return (
            <View style={{ gap: spacing.xl }}>
              <View style={[styles.hero, { gap: spacing.sm }]}>
                <View style={[styles.avatar, { borderColor: colors.accent }]}>
                  {user.photos[0] ? (
                    <PhotoView
                      url={user.photos[0].url}
                      label={`Your photo, ${user.firstName}`}
                      style={{ width: 120, height: 120 }}
                    />
                  ) : (
                    <View
                      style={{ width: 120, height: 120, backgroundColor: colors.surfaceMuted }}
                    />
                  )}
                </View>
                <Text variant="title">
                  {user.firstName}, {ageFromBirthdate(user.birthdate)}
                </Text>
                <View style={[styles.chips, { gap: spacing.sm }]}>
                  {user.kind === 'animal_lover' ? (
                    <Chip label="Animal Lover" tone="sage" />
                  ) : (
                    pets.map((pet) => (
                      <Chip
                        key={pet.id}
                        label={`${pet.name} · ${SPECIES_LABELS[pet.species]}`}
                        tone="primary"
                      />
                    ))
                  )}
                </View>
              </View>

              {todo.length > 0 && (
                <View
                  accessible
                  accessibilityLabel={`Profile ${Math.round(score * 100)} percent complete. Still to do: ${todo.map((t) => t.label).join(', ')}`}
                  style={{
                    backgroundColor: colors.accent,
                    borderRadius: radii.lg,
                    padding: spacing.lg,
                    gap: spacing.sm,
                  }}
                >
                  <Text variant="bodyStrong" color="onAccent">
                    Your profile is {Math.round(score * 100)}% complete
                  </Text>
                  {todo.slice(0, 3).map((t) => (
                    <Pressable
                      key={t.key}
                      onPress={() => openItem(t.key)}
                      accessibilityRole="button"
                      accessibilityLabel={t.label}
                      accessibilityHint="Opens the screen where you can do this"
                      style={styles.todoRow}
                    >
                      <Text variant="small" color="onAccent" style={styles.todoText}>
                        • {t.label}
                      </Text>
                      <Icon name="chevron-right" size={18} color={colors.onAccent} />
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={{ gap: spacing.sm }}>
                <ListRow
                  title="Edit profile"
                  subtitle="Photos, prompts, pets and more"
                  leading={<Icon name="edit" color={colors.primary} />}
                  onPress={() => router.push('/edit-profile')}
                />
                <ListRow
                  title="Preferences"
                  subtitle="Who you see: age, distance, pets, dealbreakers"
                  leading={<Icon name="compass" color={colors.primary} />}
                  onPress={() => router.push('/preferences')}
                />
                <ListRow
                  title="Preview"
                  subtitle="See your profile as others do"
                  leading={<Icon name="eye" color={colors.primary} />}
                  onPress={() => router.push('/preview')}
                />
                <ListRow
                  title="Settings"
                  subtitle="Account, notifications, privacy"
                  leading={<Icon name="sliders" color={colors.primary} />}
                  onPress={() => router.push('/settings')}
                />
              </View>
            </View>
          );
        })()
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  todoRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8 },
  todoText: { flex: 1 },
  avatar: { width: 128, height: 128, borderRadius: 64, borderWidth: 4, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
