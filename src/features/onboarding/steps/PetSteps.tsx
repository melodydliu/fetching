import { useState } from 'react';
import { View } from 'react-native';
import {
  PetBasicsSection,
  PetDetailsSection,
  PetPhotosSection,
  PetVibeSection,
} from '@/components/pets/PetSections';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import {
  draftToPetFields,
  type PetDraft,
  validatePetBasics,
  validatePetDetails,
  validatePetPhotos,
} from '@/domain/petDraft';
import { pickPhotoUris, useProfileActions } from '@/hooks/profileActions';
import { StepLayout } from '../StepLayout';
import type { StepProps } from '../types';

interface PetStepProps extends StepProps {
  draft: PetDraft;
  onDraftChange: (patch: Partial<PetDraft>) => void;
  /** Id of the pet being filled in, or null before it has been created. */
  petId: string | null;
  onPetCreated: (id: string) => void;
}

export function PetBasicsStep({
  draft,
  onDraftChange,
  petId,
  onPetCreated,
  ...step
}: PetStepProps) {
  const { createPet, updatePet } = useProfileActions();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const fields = draftToPetFields(draft);
      if (petId) {
        await updatePet(petId, {
          name: fields.name,
          species: fields.species,
          breed: fields.breed,
          size: fields.size,
        });
      } else {
        onPetCreated((await createPet(fields)).id);
      }
      step.onContinue();
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepLayout
      title="Tell us about your pet"
      subtitle="Who's the star of the show?"
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={!validatePetBasics(draft)}
      primaryLoading={saving}
      onPrimary={() => void save()}
    >
      <PetBasicsSection draft={draft} onChange={onDraftChange} />
    </StepLayout>
  );
}

export function PetDetailsStep({ draft, onDraftChange, petId, ...step }: PetStepProps) {
  const { updatePet } = useProfileActions();
  return (
    <StepLayout
      title={`About ${draft.name || 'your pet'}`}
      subtitle="The basics people ask about first."
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={!validatePetDetails(draft)}
      onPrimary={() => {
        const f = draftToPetFields(draft);
        if (petId) void updatePet(petId, { breed: f.breed, ageYears: f.ageYears, size: f.size });
        step.onContinue();
      }}
    >
      <PetDetailsSection draft={draft} onChange={onDraftChange} />
    </StepLayout>
  );
}

export function PetVibeStep({ draft, onDraftChange, petId, ...step }: PetStepProps) {
  const { updatePet } = useProfileActions();
  return (
    <StepLayout
      title={`What's ${draft.name || 'your pet'} like?`}
      subtitle="This helps us find people whose pets will get along."
      progress={step.progress}
      onBack={step.onBack}
      onPrimary={() => {
        const f = draftToPetFields(draft);
        if (petId) {
          void updatePet(petId, {
            energy: f.energy,
            goodWith: f.goodWith,
            personalityTags: f.personalityTags,
          });
        }
        step.onContinue();
      }}
    >
      <PetVibeSection draft={draft} onChange={onDraftChange} />
    </StepLayout>
  );
}

export function PetPhotosStep({ draft, onDraftChange, petId, ...step }: PetStepProps) {
  const { updatePet, uploadPhotos } = useProfileActions();
  const [adding, setAdding] = useState(false);

  const change = (photos: PetDraft['photos']) => {
    onDraftChange({ photos });
    if (petId) void updatePet(petId, { photos });
  };

  const add = async () => {
    setAdding(true);
    try {
      const uris = await pickPhotoUris(6 - draft.photos.length);
      if (uris.length) change([...draft.photos, ...(await uploadPhotos(uris))]);
    } finally {
      setAdding(false);
    }
  };

  return (
    <StepLayout
      title={`Show off ${draft.name || 'your pet'}`}
      subtitle="Add at least 3 photos. Action shots and goofy ones are the best."
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={!validatePetPhotos(draft)}
      onPrimary={() => step.onContinue()}
    >
      <PetPhotosSection
        draft={draft}
        onChange={(patch) => patch.photos && change(patch.photos)}
        onAddPress={() => void add()}
        adding={adding}
      />
    </StepLayout>
  );
}

export function MorePetsStep({
  onAddAnother,
  ...step
}: StepProps & { onAddAnother: () => void; petCount: number }) {
  return (
    <StepLayout
      title="Any other pets?"
      subtitle="Multi-pet household? Add everyone. They all count."
      progress={step.progress}
      onBack={step.onBack}
      primaryLabel="That's everyone"
      onPrimary={() => step.onContinue()}
    >
      <View style={{ gap: 12 }}>
        <Text variant="body" color="textMuted">
          You&apos;ve added {step.petCount} {step.petCount === 1 ? 'pet' : 'pets'} so far.
        </Text>
        <Button label="Add another pet" icon="plus" variant="secondary" onPress={onAddAnother} />
      </View>
    </StepLayout>
  );
}
