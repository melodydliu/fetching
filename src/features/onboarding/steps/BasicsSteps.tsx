import { useState } from 'react';
import { View } from 'react-native';
import { BirthdateFields } from '@/components/BirthdateFields';
import { Illustration } from '@/components/illustrations/Illustration';
import { OptionCard } from '@/components/ui/OptionCard';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { config } from '@/config';
import { GENDER_OPTIONS, INTEREST_OPTIONS, RELATIONSHIP_GOAL_LABELS } from '@/config/reference';
import type { BirthdateResult } from '@/domain/onboarding';
import type { Gender, RelationshipGoal } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
import { locateMe } from '@/utils/location';
import { StepLayout } from '../StepLayout';
import type { StepProps } from '../types';

export function NameStep({ profile, ...step }: StepProps) {
  const [name, setName] = useState(profile.user.firstName);
  const trimmed = name.trim();
  return (
    <StepLayout
      title="What's your first name?"
      subtitle="This is how you'll appear on your profile."
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={trimmed.length === 0}
      onPrimary={() => step.onContinue({ firstName: trimmed })}
    >
      <TextField
        label="First name"
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={30}
        returnKeyType="done"
        onSubmitEditing={() => trimmed && step.onContinue({ firstName: trimmed })}
      />
    </StepLayout>
  );
}

export function BirthdayStep({ profile, ...step }: StepProps) {
  const [result, setResult] = useState<BirthdateResult>({ ok: false, reason: 'incomplete' });
  return (
    <StepLayout
      title="When's your birthday?"
      subtitle={`You must be ${config.minAge} or older. We show your age, never your birthday.`}
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={!result.ok}
      onPrimary={() => result.ok && step.onContinue({ birthdate: result.birthdate })}
    >
      <BirthdateFields autoFocus initial={profile.user.birthdate} onResult={setResult} />
    </StepLayout>
  );
}

const GENDERS = GENDER_OPTIONS;

export function GenderStep({ profile, ...step }: StepProps) {
  // A fresh account carries a placeholder gender, so require an explicit tap.
  const alreadyChosen = profile.user.onboardingSteps.includes('gender');
  const [gender, setGender] = useState<Gender | null>(alreadyChosen ? profile.user.gender : null);
  return (
    <StepLayout
      title="How do you identify?"
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={!gender}
      onPrimary={() => gender && step.onContinue({ gender })}
    >
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {GENDERS.map((g) => (
          <OptionCard
            key={g.value}
            title={g.label}
            selected={gender === g.value}
            onPress={() => setGender(g.value)}
          />
        ))}
      </View>
    </StepLayout>
  );
}

const INTERESTS = INTEREST_OPTIONS;

export function InterestedInStep({ profile, ...step }: StepProps) {
  const [picked, setPicked] = useState<Gender[]>(profile.user.interestedIn);
  const everyone = picked.length === INTERESTS.length;
  const toggle = (g: Gender) =>
    setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));
  return (
    <StepLayout
      title="Who are you interested in meeting?"
      subtitle="Pick all that apply. You can change this later."
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={picked.length === 0}
      onPrimary={() => step.onContinue({ interestedIn: picked })}
    >
      <View style={{ gap: 12 }}>
        {INTERESTS.map((g) => (
          <OptionCard
            key={g.value}
            role="checkbox"
            title={g.label}
            selected={picked.includes(g.value)}
            onPress={() => toggle(g.value)}
          />
        ))}
        <OptionCard
          role="checkbox"
          title="Everyone"
          selected={everyone}
          onPress={() => setPicked(everyone ? [] : INTERESTS.map((i) => i.value))}
        />
      </View>
    </StepLayout>
  );
}

type LocationState = 'idle' | 'loading' | 'denied' | 'error';

export function LocationStep({ profile, ...step }: StepProps) {
  const { spacing } = useTheme();
  const [state, setState] = useState<LocationState>('idle');

  const requestLocation = async () => {
    setState('loading');
    const result = await locateMe();
    if (result.ok) return step.onContinue({ location: result.location });
    setState(result.reason === 'denied' ? 'denied' : 'error');
  };

  return (
    <StepLayout
      title="Where are you based?"
      subtitle="We use your location to show people and pets nearby. You can change it any time."
      progress={step.progress}
      onBack={step.onBack}
      primaryLabel="Use my location"
      onPrimary={() => void requestLocation()}
      primaryLoading={state === 'loading'}
      onSkip={step.onSkip}
    >
      <View style={{ alignItems: 'center', gap: spacing.lg }}>
        <Illustration name="onboarding-location" />
        {state === 'denied' && (
          <Text variant="small" color="textMuted" align="center" accessibilityLiveRegion="polite">
            No problem. You can turn location on later in Settings. For now we&apos;ll use{' '}
            {config.mockCenter.city}.
          </Text>
        )}
        {state === 'error' && (
          <Text variant="small" color="danger" align="center" accessibilityLiveRegion="polite">
            We couldn&apos;t get your location. Try again, or continue without it.
          </Text>
        )}
      </View>
    </StepLayout>
  );
}

export function GoalStep({ profile, ...step }: StepProps) {
  const [goals, setGoals] = useState<RelationshipGoal[]>(profile.user.relationshipGoals);
  return (
    <StepLayout
      title="What are you looking for?"
      subtitle="Pick all that apply. Honest answers lead to better matches."
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={goals.length === 0}
      onPrimary={() => goals.length > 0 && step.onContinue({ relationshipGoals: goals })}
      onSkip={step.onSkip}
    >
      <View style={{ gap: 12 }}>
        {(Object.keys(RELATIONSHIP_GOAL_LABELS) as RelationshipGoal[]).map((g) => (
          <OptionCard
            key={g}
            title={RELATIONSHIP_GOAL_LABELS[g]}
            role="checkbox"
            selected={goals.includes(g)}
            onPress={() =>
              setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
            }
          />
        ))}
      </View>
    </StepLayout>
  );
}
