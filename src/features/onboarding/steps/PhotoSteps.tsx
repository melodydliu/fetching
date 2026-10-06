import { useState } from 'react';
import { View } from 'react-native';
import { PhotoGrid } from '@/components/PhotoGrid';
import { OptionCard } from '@/components/ui/OptionCard';
import { Text } from '@/components/ui/Text';
import { config } from '@/config';
import type { AccountKind } from '@/domain/types';
import { pickPhotoUris, useProfileActions } from '@/hooks/profileActions';
import { StepLayout } from '../StepLayout';
import type { StepProps } from '../types';

export function PhotosStep({ profile, ...step }: StepProps) {
  const { updateUser, uploadPhotos } = useProfileActions();
  const [adding, setAdding] = useState(false);
  const photos = profile.user.photos;

  const add = async () => {
    setAdding(true);
    try {
      const uris = await pickPhotoUris(config.maxPhotos - photos.length);
      if (uris.length) await updateUser({ photos: [...photos, ...(await uploadPhotos(uris))] });
    } finally {
      setAdding(false);
    }
  };

  return (
    <StepLayout
      title="Add your best photos"
      subtitle={`At least ${config.minPhotos}. Your first photo is your main one. Tap a photo to add a caption, hold and drag to reorder.`}
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={photos.length < config.minPhotos}
      onPrimary={() => step.onContinue()}
    >
      <PhotoGrid
        photos={photos}
        max={config.maxPhotos}
        captions
        adding={adding}
        onAddPress={() => void add()}
        onChange={(next) => void updateUser({ photos: next })}
      />
      <Text variant="small" color="textMuted" accessibilityLiveRegion="polite">
        {photos.length < config.minPhotos
          ? `${config.minPhotos - photos.length} more to go. Clear, smiling photos of just you work best.`
          : 'Looking good!'}
      </Text>
    </StepLayout>
  );
}

export function HasPetStep({ profile, ...step }: StepProps) {
  const alreadyChosen = profile.user.onboardingSteps.includes('has-pet');
  const [kind, setKind] = useState<AccountKind | null>(alreadyChosen ? profile.user.kind : null);
  return (
    <StepLayout
      title="Do you have a pet?"
      subtitle="If so, include them in your profile. If not, you’re still welcome here as an animal lover!"
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={!kind}
      onPrimary={() =>
        kind &&
        step.onContinue({
          kind,
          animalLover:
            kind === 'animal_lover'
              ? (profile.user.animalLover ?? { lovedSpecies: [], openToPetSpecies: [] })
              : undefined,
        })
      }
    >
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        <OptionCard
          title="Yes, I have a pet"
          subtitle="Dog, cat, rabbit, bird, or anything with fur, feathers or scales"
          selected={kind === 'pet_owner'}
          onPress={() => setKind('pet_owner')}
        />
        <OptionCard
          title="No, but I'm an animal lover"
          subtitle="You'll get a friendly Animal Lover label on your profile"
          selected={kind === 'animal_lover'}
          onPress={() => setKind('animal_lover')}
        />
      </View>
    </StepLayout>
  );
}
