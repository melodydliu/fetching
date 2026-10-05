import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PromptEditor } from '@/components/PromptEditor';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { PhotoView } from '@/components/ui/PhotoView';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { config } from '@/config';
import { RELATIONSHIP_GOAL_LABELS, SPECIES, SPECIES_LABELS } from '@/config/reference';
import type { Basics, Profile, RelationshipGoal } from '@/domain/types';
import { pickPhotoUris, useProfileActions } from '@/hooks/profileActions';
import { useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
      <View style={{ gap: 2 }}>
        <Text variant="heading">{title}</Text>
        {hint ? (
          <Text variant="small" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Changes save automatically (optimistically); there is no Save button. */
export default function EditProfileScreen() {
  const { colors, spacing } = useTheme();
  const profile = useViewerProfile();

  return (
    <Screen scroll>
      <ScreenHeader title="Edit profile" back />
      {profile.isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={240} radius={20} />
          <Skeleton height={80} radius={20} />
        </View>
      ) : profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : (
        <EditForm profile={profile.data} />
      )}
      <Text
        variant="caption"
        color="textSubtle"
        align="center"
        style={{ color: colors.textSubtle }}
      >
        Changes save automatically.
      </Text>
    </Screen>
  );
}

function EditForm({ profile }: { profile: Profile }) {
  const { colors, spacing } = useTheme();
  const { updateUser, uploadPhotos } = useProfileActions();
  const { user, pets } = profile;
  const [adding, setAdding] = useState(false);
  const [basics, setBasics] = useState<Basics>(user.basics);

  const addPhotos = async () => {
    setAdding(true);
    try {
      const uris = await pickPhotoUris(config.maxPhotos - user.photos.length);
      if (uris.length)
        await updateUser({ photos: [...user.photos, ...(await uploadPhotos(uris))] });
    } finally {
      setAdding(false);
    }
  };

  const saveBasics = () => {
    const clean: Basics = {
      job: basics.job?.trim() || undefined,
      school: basics.school?.trim() || undefined,
      hometown: basics.hometown?.trim() || undefined,
    };
    void updateUser({ basics: clean });
  };

  const speciesOptions = SPECIES.map((s) => ({ value: s, label: SPECIES_LABELS[s] }));
  const lover = user.animalLover;

  return (
    <View>
      <Section
        title="Photos"
        hint={`${config.minPhotos}–${config.maxPhotos} photos. Tap one to add a caption. Hold and drag to reorder.`}
      >
        <PhotoGrid
          photos={user.photos}
          max={config.maxPhotos}
          minToKeep={config.minPhotos}
          captions
          adding={adding}
          onAddPress={() => void addPhotos()}
          onChange={(photos) => void updateUser({ photos })}
        />
      </Section>

      <Section title="Prompts" hint="Specific answers get more likes.">
        <PromptEditor
          kind={user.kind}
          answers={user.promptAnswers}
          onChange={(promptAnswers) => void updateUser({ promptAnswers })}
        />
      </Section>

      <Section title="About you">
        <View style={{ gap: spacing.md }}>
          <TextField
            label="Job"
            value={basics.job ?? ''}
            onChangeText={(job) => setBasics((b) => ({ ...b, job }))}
            onBlur={saveBasics}
            maxLength={40}
          />
          <TextField
            label="School"
            value={basics.school ?? ''}
            onChangeText={(school) => setBasics((b) => ({ ...b, school }))}
            onBlur={saveBasics}
            maxLength={40}
          />
          <TextField
            label="Hometown"
            value={basics.hometown ?? ''}
            onChangeText={(hometown) => setBasics((b) => ({ ...b, hometown }))}
            onBlur={saveBasics}
            maxLength={40}
          />
        </View>
      </Section>

      <Section title="Looking for" hint="Pick all that apply.">
        <ChoiceChips
          multiple
          label="Looking for"
          options={(Object.keys(RELATIONSHIP_GOAL_LABELS) as RelationshipGoal[]).map((g) => ({
            value: g,
            label: RELATIONSHIP_GOAL_LABELS[g],
          }))}
          value={user.relationshipGoals}
          onChange={(relationshipGoals) => void updateUser({ relationshipGoals })}
        />
      </Section>

      {user.kind === 'pet_owner' ? (
        <Section title="Your pets" hint="Each pet needs at least 3 photos.">
          <View style={{ gap: spacing.sm }}>
            {pets.map((pet) => (
              <ListRow
                key={pet.id}
                title={pet.name}
                subtitle={`${pet.breed ?? SPECIES_LABELS[pet.species]} · ${pet.photos.length} photos`}
                leading={
                  pet.photos[0] ? (
                    <View style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden' }}>
                      <PhotoView
                        url={pet.photos[0].url}
                        label={`Photo of ${pet.name}`}
                        style={{ width: 48, height: 48 }}
                      />
                    </View>
                  ) : (
                    <Icon name="paw" color={colors.primary} />
                  )
                }
                onPress={() => router.push({ pathname: '/pet/[id]', params: { id: pet.id } })}
              />
            ))}
            <Button
              label="Add a pet"
              icon="plus"
              variant="secondary"
              onPress={() => router.push({ pathname: '/pet/[id]', params: { id: 'new' } })}
            />
          </View>
        </Section>
      ) : (
        <>
          <Section title="Animals you love">
            <ChoiceChips
              multiple
              label="Animals you love"
              options={speciesOptions}
              value={lover?.lovedSpecies ?? []}
              onChange={(lovedSpecies) =>
                void updateUser({
                  animalLover: { openToPetSpecies: lover?.openToPetSpecies ?? [], lovedSpecies },
                })
              }
            />
          </Section>
          <Section
            title="Open to dating someone with"
            hint="Leave empty if you'd rather date someone without pets."
          >
            <ChoiceChips
              multiple
              label="Open to pets"
              options={speciesOptions}
              value={lover?.openToPetSpecies ?? []}
              onChange={(openToPetSpecies) =>
                void updateUser({
                  animalLover: { lovedSpecies: lover?.lovedSpecies ?? [], openToPetSpecies },
                })
              }
            />
          </Section>
        </>
      )}

      {user.kind === 'animal_lover' && (
        <Section title="Allergies">
          <ChoiceChips
            multiple
            label="Allergies"
            options={speciesOptions}
            value={user.allergies}
            onChange={(allergies) => void updateUser({ allergies })}
          />
        </Section>
      )}
    </View>
  );
}
