import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { SpotIllustration } from '@/components/illustrations/SpotIllustration';
import { OptionCard } from '@/components/ui/OptionCard';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { config } from '@/config';
import { RELATIONSHIP_GOAL_LABELS } from '@/config/reference';
import { BIRTHDATE_MESSAGES, validateBirthdate } from '@/domain/onboarding';
import type { Gender, RelationshipGoal } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
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
  const [y0, m0, d0] = profile.user.birthdate ? profile.user.birthdate.split('-') : ['', '', ''];
  const [month, setMonth] = useState(m0 ? String(Number(m0)) : '');
  const [day, setDay] = useState(d0 ? String(Number(d0)) : '');
  const [year, setYear] = useState(y0 ?? '');
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const result = validateBirthdate(month, day, year);
  const message = result.ok ? null : BIRTHDATE_MESSAGES[result.reason];
  const digits = (s: string) => s.replace(/[^0-9]/g, '');

  return (
    <StepLayout
      title="When's your birthday?"
      subtitle={`You must be ${config.minAge} or older. We show your age, never your birthday.`}
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={!result.ok}
      onPrimary={() => result.ok && step.onContinue({ birthdate: result.birthdate })}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Month"
            value={month}
            onChangeText={(t) => {
              const v = digits(t);
              setMonth(v);
              if (v.length === 2) dayRef.current?.focus();
            }}
            placeholder="MM"
            keyboardType="number-pad"
            maxLength={2}
            autoFocus
            style={{ textAlign: 'center' }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            ref={dayRef}
            label="Day"
            value={day}
            onChangeText={(t) => {
              const v = digits(t);
              setDay(v);
              if (v.length === 2) yearRef.current?.focus();
            }}
            placeholder="DD"
            keyboardType="number-pad"
            maxLength={2}
            style={{ textAlign: 'center' }}
          />
        </View>
        <View style={{ flex: 1.6 }}>
          <TextField
            ref={yearRef}
            label="Year"
            value={year}
            onChangeText={(t) => setYear(digits(t))}
            placeholder="YYYY"
            keyboardType="number-pad"
            maxLength={4}
            style={{ textAlign: 'center' }}
          />
        </View>
      </View>
      {message ? (
        <Text variant="small" color="danger" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : result.ok ? (
        <Text variant="bodyStrong" color="sageStrong" accessibilityLiveRegion="polite">
          You&apos;re {result.age}.
        </Text>
      ) : null}
    </StepLayout>
  );
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Nonbinary' },
];

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

const INTERESTS: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Women' },
  { value: 'man', label: 'Men' },
  { value: 'nonbinary', label: 'Nonbinary people' },
];

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
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setState('denied');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
      const city = place?.city ?? place?.subregion ?? place?.region ?? 'Near you';
      // Mock data is seeded around config.mockCenter, so while mocks are on we keep
      // those coordinates (but the real place name) or Discover would be empty away from home.
      const coords = config.useMocks
        ? { lat: config.mockCenter.lat, lng: config.mockCenter.lng }
        : { lat: pos.coords.latitude, lng: pos.coords.longitude };
      step.onContinue({ location: { ...coords, city } });
    } catch {
      setState('error');
    }
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
        <SpotIllustration name="tennis-ball" size={200} />
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
