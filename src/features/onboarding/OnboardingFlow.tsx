import { useState } from 'react';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { defaultPreferences } from '@/domain/defaults';
import { ageFromBirthdate } from '@/domain/geo';
import {
  nextStep,
  type OnboardingStepId,
  firstIncompleteStep,
  previousStep,
  SKIPPABLE_STEPS,
  stepProgress,
} from '@/domain/onboarding';
import { emptyPetDraft, type PetDraft, petToDraft } from '@/domain/petDraft';
import type { Profile } from '@/domain/types';
import { useProfileActions } from '@/hooks/profileActions';
import {
  DoneStep,
  LoverAllergiesStep,
  LoverOpenStep,
  LoverSpeciesStep,
  PromptsStep,
} from './steps/FinishSteps';
import {
  BirthdayStep,
  GenderStep,
  GoalStep,
  InterestedInStep,
  LocationStep,
  NameStep,
} from './steps/BasicsSteps';
import { HasPetStep, PhotosStep } from './steps/PhotoSteps';
import {
  MorePetsStep,
  PetBasicsStep,
  PetDetailsStep,
  PetPhotosStep,
  PetVibeStep,
} from './steps/PetSteps';
import type { StepProps, UserPatch } from './types';

/**
 * Runs the whole onboarding, one question per screen. Progress is saved as it goes
 * (each finished or skipped step is recorded on the user), so a relaunch resumes in place.
 */
export function OnboardingFlow({ profile }: { profile: Profile }) {
  const { updateUser } = useProfileActions();
  const { user, pets } = profile;

  const [step, setStep] = useState<OnboardingStepId>(() =>
    firstIncompleteStep(user.onboardingSteps, user.kind),
  );
  // The pet currently being filled in (resume into an unfinished one, else start fresh).
  const [petId, setPetId] = useState<string | null>(
    () => pets.find((p) => p.photos.length < 3)?.id ?? null,
  );
  const [draft, setDraft] = useState<PetDraft>(() => {
    const unfinished = pets.find((p) => p.photos.length < 3);
    return unfinished ? petToDraft(unfinished) : emptyPetDraft();
  });

  const finish = (id: OnboardingStepId, patch: UserPatch = {}) => {
    const kind = patch.kind ?? user.kind;
    const done = [...new Set([...user.onboardingSteps, id])];
    if (id === 'done') {
      const age = ageFromBirthdate(user.birthdate);
      void updateUser({
        ...patch,
        onboardingSteps: done,
        onboardingComplete: true,
        preferences: defaultPreferences(age, user.interestedIn),
      });
      return;
    }
    void updateUser({ ...patch, onboardingSteps: done });
    setStep(nextStep(id, kind));
  };

  const goBack = () => {
    const prev = previousStep(step, user.kind);
    if (!prev) return;
    // Stepping back into a pet's screens edits the most recent pet.
    if (prev.startsWith('pet-') && !petId && pets.length) {
      const last = pets[pets.length - 1]!;
      setPetId(last.id);
      setDraft(petToDraft(last));
    }
    setStep(prev);
  };

  const common: StepProps = {
    profile,
    progress: stepProgress(step, user.kind),
    onBack: previousStep(step, user.kind) ? goBack : undefined,
    onContinue: (patch) => finish(step, patch),
    onSkip: SKIPPABLE_STEPS.has(step) ? () => finish(step) : undefined,
  };
  const petProps = {
    ...common,
    draft,
    petId,
    onDraftChange: (patch: Partial<PetDraft>) => setDraft((d) => ({ ...d, ...patch })),
    onPetCreated: setPetId,
  };

  const screen = (() => {
    switch (step) {
      case 'name':
        return <NameStep {...common} />;
      case 'birthday':
        return <BirthdayStep {...common} />;
      case 'gender':
        return <GenderStep {...common} />;
      case 'interested-in':
        return <InterestedInStep {...common} />;
      case 'location':
        return <LocationStep {...common} />;
      case 'goal':
        return <GoalStep {...common} />;
      case 'photos':
        return <PhotosStep {...common} />;
      case 'has-pet':
        return <HasPetStep {...common} />;
      case 'pet-basics':
        return <PetBasicsStep {...petProps} />;
      case 'pet-details':
        return <PetDetailsStep {...petProps} />;
      case 'pet-vibe':
        return <PetVibeStep {...petProps} />;
      case 'pet-photos':
        return <PetPhotosStep {...petProps} />;
      case 'more-pets':
        return (
          <MorePetsStep
            {...common}
            petCount={pets.length}
            onAddAnother={() => {
              setPetId(null);
              setDraft(emptyPetDraft());
              setStep('pet-basics');
            }}
          />
        );
      case 'lover-species':
        return <LoverSpeciesStep {...common} />;
      case 'lover-allergies':
        return <LoverAllergiesStep {...common} />;
      case 'lover-open':
        return <LoverOpenStep {...common} />;
      case 'prompts':
        return <PromptsStep {...common} />;
      case 'done':
        return <DoneStep {...common} />;
    }
  })();

  return (
    <Animated.View key={step} entering={FadeInRight.duration(220)} style={{ flex: 1 }}>
      {screen}
    </Animated.View>
  );
}
