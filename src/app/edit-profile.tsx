import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { BirthdateFields } from '@/components/BirthdateFields';
import { PhotoGrid } from '@/components/PhotoGrid';
import { SaveBar } from '@/components/SaveBar';
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
import {
  GENDER_OPTIONS,
  INTEREST_OPTIONS,
  RELATIONSHIP_GOAL_LABELS,
  SPECIES,
  SPECIES_LABELS,
} from '@/config/reference';
import type { BirthdateResult } from '@/domain/onboarding';
import {
  changedFields,
  profileUpdateFor,
  draftFromUser,
  draftProblem,
  type ProfileDraft,
} from '@/domain/profileDraft';
import type { Profile, RelationshipGoal } from '@/domain/types';
import { pickPhotoUris, useProfileActions } from '@/hooks/profileActions';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';
import { useViewerProfile } from '@/hooks/queries';
import { locateMe, lookUpPlace, type LocateResult } from '@/utils/location';
import { useTheme } from '@/hooks/useTheme';
import { useToastStore } from '@/state/toastStore';

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

/** Edits a draft; nothing is saved until you tap Save changes. */
export default function EditProfileScreen() {
  const { spacing } = useTheme();
  const profile = useViewerProfile();

  if (profile.data) return <EditForm profile={profile.data} />;
  return (
    <Screen scroll>
      <ScreenHeader title="Edit profile" back />
      {profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={240} radius={20} />
          <Skeleton height={80} radius={20} />
        </View>
      )}
    </Screen>
  );
}

function EditForm({ profile }: { profile: Profile }) {
  const { colors, spacing } = useTheme();
  const { updateUser, uploadPhotos } = useProfileActions();
  const toast = useToastStore((t) => t.show);
  const { user, pets } = profile;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromUser(user));
  const patch = (changes: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const [place, setPlace] = useState('');
  const [locating, setLocating] = useState<'gps' | 'search' | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [birth, setBirth] = useState<BirthdateResult>({
    ok: true,
    birthdate: user.birthdate,
    age: 0,
  });
  const [saving, setSaving] = useState(false);

  const onBirth = useCallback((result: BirthdateResult) => {
    setBirth(result);
    if (result.ok) {
      setDraft((d) =>
        d.birthdate === result.birthdate ? d : { ...d, birthdate: result.birthdate },
      );
    }
  }, []);

  const changes = changedFields(user, draft);
  const dirty = Object.keys(changes).length > 0;
  const problem = draftProblem(draft, birth.ok);

  const { markSaved } = useDiscardGuard(dirty);

  const save = async () => {
    if (!dirty || problem) return;
    setSaving(true);
    await updateUser(profileUpdateFor(user, changes));
    markSaved();
    toast('Profile saved');
    router.back();
  };

  const addPhotos = async () => {
    setAdding(true);
    try {
      const uris = await pickPhotoUris(config.maxPhotos - draft.photos.length);
      if (uris.length) patch({ photos: [...draft.photos, ...(await uploadPhotos(uris))] });
    } finally {
      setAdding(false);
    }
  };

  const applyLocation = (result: LocateResult) => {
    if (result.ok) {
      setLocationError(null);
      setPlace('');
      patch({ location: result.location });
      return;
    }
    setLocationError(
      {
        denied: 'Location access is off. Turn it on in your phone settings, or type a city or zip.',
        not_found: "We couldn't find that place. Try a city name or a zip code.",
        error: "Couldn't update your location. Try again.",
      }[result.reason],
    );
  };

  const locateWithGps = async () => {
    setLocating('gps');
    applyLocation(await locateMe());
    setLocating(null);
  };

  const searchPlace = async () => {
    if (!place.trim() || locating) return;
    setLocating('search');
    applyLocation(await lookUpPlace(place));
    setLocating(null);
  };

  const speciesOptions = SPECIES.map((s) => ({ value: s, label: SPECIES_LABELS[s] }));
  const lover = draft.animalLover;

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <ScreenHeader title="Edit profile" back />
        <Section
          title="Photos"
          hint={`${config.minPhotos}–${config.maxPhotos} photos. Tap one to add a caption, tap × to remove it. Hold and drag to reorder.`}
        >
          <PhotoGrid
            photos={draft.photos}
            max={config.maxPhotos}
            minToKeep={config.minPhotos}
            captions
            adding={adding}
            onAddPress={() => void addPhotos()}
            onChange={(photos) => patch({ photos })}
          />
        </Section>

        <Section title="Name and age" hint="We show your age, never your birthday.">
          <View style={{ gap: spacing.md }}>
            <TextField
              label="First name"
              value={draft.firstName}
              onChangeText={(firstName) => patch({ firstName })}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              maxLength={30}
            />
            <BirthdateFields initial={user.birthdate} onResult={onBirth} />
          </View>
        </Section>

        <Section title="Gender">
          <ChoiceChips
            label="I am"
            options={GENDER_OPTIONS}
            value={[draft.gender]}
            onChange={([gender]) => gender && patch({ gender })}
          />
        </Section>

        <Section title="Interested in">
          <ChoiceChips
            multiple
            label="Interested in"
            options={INTEREST_OPTIONS}
            value={draft.interestedIn}
            onChange={(interestedIn) => patch({ interestedIn })}
          />
        </Section>

        <Section title="About you">
          <View style={{ gap: spacing.md }}>
            <TextField
              label="Job"
              value={draft.basics.job ?? ''}
              onChangeText={(job) => patch({ basics: { ...draft.basics, job } })}
              maxLength={40}
            />
            <TextField
              label="Hometown"
              value={draft.basics.hometown ?? ''}
              onChangeText={(hometown) => patch({ basics: { ...draft.basics, hometown } })}
              maxLength={40}
            />
          </View>
        </Section>

        <Section
          title="Location"
          hint="Used to show people and pets nearby. Others see your distance, never your address."
        >
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="pin" size={20} color={colors.primary} />
              <Text
                variant="bodyStrong"
                accessibilityLabel={`Current location: ${draft.location.city}`}
              >
                {draft.location.city}
              </Text>
            </View>
            <Button
              label="Use my current location"
              variant="secondary"
              icon="pin"
              loading={locating === 'gps'}
              disabled={locating === 'search'}
              onPress={() => void locateWithGps()}
            />
            <TextField
              label="Or type a city or zip code"
              value={place}
              onChangeText={(t) => {
                setPlace(t);
                setLocationError(null);
              }}
              placeholder="Oakland, or 94607"
              autoCapitalize="words"
              autoComplete="postal-code"
              returnKeyType="search"
              onSubmitEditing={() => void searchPlace()}
              maxLength={60}
            />
            <Button
              label="Set location"
              variant="secondary"
              loading={locating === 'search'}
              disabled={!place.trim() || locating === 'gps'}
              onPress={() => void searchPlace()}
            />
            {locationError ? (
              <Text variant="small" color="danger" accessibilityLiveRegion="polite">
                {locationError}
              </Text>
            ) : null}
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
            value={draft.relationshipGoals}
            onChange={(relationshipGoals) => patch({ relationshipGoals })}
          />
        </Section>

        <Section title="Prompts" hint="Specific answers get more likes.">
          <PromptEditor
            kind={user.kind}
            answers={draft.promptAnswers}
            onChange={(promptAnswers) => patch({ promptAnswers })}
          />
        </Section>

        <Section
          title="Your pets"
          hint={
            pets.length > 0
              ? 'Each pet needs at least 3 photos.'
              : 'Have a pet? Add them and your profile will show them.'
          }
        >
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

        {user.kind === 'animal_lover' && (
          <>
            <Section title="Animals you love">
              <ChoiceChips
                multiple
                label="Animals you love"
                options={speciesOptions}
                value={lover?.lovedSpecies ?? []}
                onChange={(lovedSpecies) =>
                  patch({
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
                  patch({
                    animalLover: { lovedSpecies: lover?.lovedSpecies ?? [], openToPetSpecies },
                  })
                }
              />
            </Section>
          </>
        )}
      </Screen>
      <SaveBar dirty={dirty} problem={problem} saving={saving} onSave={() => void save()} />
    </View>
  );
}
