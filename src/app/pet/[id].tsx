import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import {
  PetBasicsSection,
  PetDetailsSection,
  PetPhotosSection,
  PetVibeSection,
} from '@/components/pets/PetSections';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import {
  draftToPetFields,
  emptyPetDraft,
  type PetDraft,
  petToDraft,
  validatePet,
  validatePetBasics,
  validatePetDetails,
  validatePetPhotos,
} from '@/domain/petDraft';
import { pickPhotoUris, useProfileActions } from '@/hooks/profileActions';
import { useViewerProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';

/** Add (`/pet/new`) or edit (`/pet/<id>`) a pet. Unlike the rest of profile editing, this one has a Save button. */
export default function PetEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useViewerProfile();
  if (!profile.data) {
    return (
      <Screen scroll>
        <ScreenHeader title="Pet" back />
        <Skeleton height={320} radius={20} />
      </Screen>
    );
  }
  const pet = id === 'new' ? undefined : profile.data.pets.find((p) => p.id === id);
  return (
    <PetEditor
      key={id}
      petId={pet?.id ?? null}
      initial={pet ? petToDraft(pet) : emptyPetDraft()}
      isLastPet={profile.data.pets.length <= 1}
    />
  );
}

function PetEditor({
  petId,
  initial,
  isLastPet,
}: {
  petId: string | null;
  initial: PetDraft;
  isLastPet: boolean;
}) {
  const { colors, spacing } = useTheme();
  const { createPet, updatePet, removePet, uploadPhotos } = useProfileActions();
  const [draft, setDraft] = useState<PetDraft>(initial);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<PetDraft>) => setDraft((d) => ({ ...d, ...p }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const valid = validatePet(draft);

  const addPhotos = async () => {
    setAdding(true);
    try {
      const uris = await pickPhotoUris(6 - draft.photos.length);
      if (uris.length) patch({ photos: [...draft.photos, ...(await uploadPhotos(uris))] });
    } finally {
      setAdding(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const fields = draftToPetFields(draft);
      if (petId) await updatePet(petId, fields);
      else await createPet(fields);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(`Remove ${draft.name || 'this pet'}?`, 'They’ll disappear from your profile.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void removePet(petId!);
          router.back();
        },
      },
    ]);

  const problems = [
    !validatePetBasics(draft) && 'a name',
    !validatePetDetails(draft) && 'age (and size for dogs)',
    !validatePetPhotos(draft) && 'at least 3 photos',
  ].filter(Boolean);

  return (
    <Screen scroll>
      <ScreenHeader title={petId ? draft.name || 'Edit pet' : 'Add a pet'} back />
      <View style={{ gap: spacing.xxl }}>
        <PetBasicsSection draft={draft} onChange={patch} />
        <PetDetailsSection draft={draft} onChange={patch} />
        <PetVibeSection draft={draft} onChange={patch} />
        <PetPhotosSection
          draft={draft}
          onChange={patch}
          onAddPress={() => void addPhotos()}
          adding={adding}
        />

        <View style={{ gap: spacing.sm }}>
          {!valid && (
            <Text variant="small" color="textMuted" accessibilityLiveRegion="polite">
              Still needed: {problems.join(', ')}.
            </Text>
          )}
          <Button
            label={petId ? 'Save changes' : 'Add pet'}
            disabled={!valid || (!!petId && !dirty)}
            loading={saving}
            onPress={() => void save()}
          />
          {petId && (
            <Button
              label="Remove pet"
              variant="danger"
              disabled={isLastPet}
              onPress={confirmDelete}
              accessibilityHint={isLastPet ? 'Pet owners need at least one pet' : undefined}
            />
          )}
          {petId && isLastPet && (
            <Text variant="caption" color="textSubtle" style={{ color: colors.textSubtle }}>
              Pet owners need at least one pet. No pet right now? Switch to Animal Lover in
              Settings.
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
