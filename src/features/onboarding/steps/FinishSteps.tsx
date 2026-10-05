import { useState } from 'react';
import { View } from 'react-native';
import { SpotIllustration } from '@/components/illustrations/SpotIllustration';
import { PromptEditor } from '@/components/PromptEditor';
import { OptionCard } from '@/components/ui/OptionCard';
import { Text } from '@/components/ui/Text';
import { config } from '@/config';
import { SPECIES, SPECIES_LABELS } from '@/config/reference';
import { profileCompleteness } from '@/domain/onboarding';
import type { PromptAnswer, Species } from '@/domain/types';
import { useProfileActions } from '@/hooks/profileActions';
import { StepLayout } from '../StepLayout';
import type { StepProps } from '../types';

function SpeciesList({
  value,
  onChange,
}: {
  value: Species[];
  onChange: (next: Species[]) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {SPECIES.map((s) => (
        <OptionCard
          key={s}
          role="checkbox"
          title={`${SPECIES_LABELS[s]}${s === 'other' ? ' (reptiles, small critters…)' : ''}`}
          selected={value.includes(s)}
          onPress={() => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s])}
        />
      ))}
    </View>
  );
}

export function LoverSpeciesStep({ profile, ...step }: StepProps) {
  const [loved, setLoved] = useState<Species[]>(profile.user.animalLover?.lovedSpecies ?? []);
  const lover = profile.user.animalLover ?? { lovedSpecies: [], openToPetSpecies: [] };
  return (
    <StepLayout
      title="Which animals do you love?"
      subtitle="Pick all that apply. It shows up on your profile."
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={loved.length === 0}
      onPrimary={() => step.onContinue({ animalLover: { ...lover, lovedSpecies: loved } })}
    >
      <SpeciesList value={loved} onChange={setLoved} />
    </StepLayout>
  );
}

export function LoverAllergiesStep({ profile, ...step }: StepProps) {
  const [allergies, setAllergies] = useState<Species[]>(profile.user.allergies);
  return (
    <StepLayout
      title="Any allergies?"
      subtitle="So you're only shown people whose pets you'll be comfortable around."
      progress={step.progress}
      onBack={step.onBack}
      primaryLabel={allergies.length ? 'Continue' : 'No allergies'}
      onPrimary={() => step.onContinue({ allergies })}
      onSkip={step.onSkip}
    >
      <SpeciesList value={allergies} onChange={setAllergies} />
    </StepLayout>
  );
}

const OPEN_GROUPS: { label: string; species: Species[] }[] = [
  { label: 'Dogs', species: ['dog'] },
  { label: 'Cats', species: ['cat'] },
  { label: 'Other pets', species: ['rabbit', 'bird', 'other'] },
];

export function LoverOpenStep({ profile, ...step }: StepProps) {
  const lover = profile.user.animalLover ?? { lovedSpecies: [], openToPetSpecies: [] };
  const [open, setOpen] = useState<Species[]>(lover.openToPetSpecies);
  const has = (g: (typeof OPEN_GROUPS)[number]) => g.species.every((s) => open.includes(s));
  const toggle = (g: (typeof OPEN_GROUPS)[number]) =>
    setOpen((o) =>
      has(g) ? o.filter((s) => !g.species.includes(s)) : [...new Set([...o, ...g.species])],
    );
  return (
    <StepLayout
      title="Open to dating someone with…"
      subtitle="Leave everything unchecked if you'd rather date someone without pets."
      progress={step.progress}
      onBack={step.onBack}
      onPrimary={() => step.onContinue({ animalLover: { ...lover, openToPetSpecies: open } })}
    >
      <View style={{ gap: 12 }}>
        {OPEN_GROUPS.map((g) => (
          <OptionCard
            key={g.label}
            role="checkbox"
            title={g.label}
            selected={has(g)}
            onPress={() => toggle(g)}
          />
        ))}
      </View>
    </StepLayout>
  );
}

export function PromptsStep({ profile, ...step }: StepProps) {
  const { updateUser } = useProfileActions();
  const answers = profile.user.promptAnswers;
  const left = config.minPromptAnswers - answers.length;
  return (
    <StepLayout
      title="Show your personality"
      subtitle="Answer 3 prompts. People like specific answers, so be specific."
      progress={step.progress}
      onBack={step.onBack}
      primaryDisabled={left > 0}
      onPrimary={() => step.onContinue()}
      onSkip={step.onSkip}
    >
      <PromptEditor
        kind={profile.user.kind}
        answers={answers}
        onChange={(next: PromptAnswer[]) => void updateUser({ promptAnswers: next })}
      />
    </StepLayout>
  );
}

export function DoneStep({ profile, ...step }: StepProps) {
  const { items } = profileCompleteness(profile);
  const missing = items.filter((i) => !i.done);
  return (
    <StepLayout
      title={`You're all set, ${profile.user.firstName}!`}
      subtitle={
        missing.length
          ? `You can finish the rest from your Profile: ${missing.map((m) => m.label.toLowerCase()).join(', ')}.`
          : 'Your profile is complete. Time to meet some people (and their pets).'
      }
      progress={1}
      onBack={step.onBack}
      primaryLabel="Start exploring"
      onPrimary={() => step.onContinue()}
    >
      <View style={{ alignItems: 'center', gap: 16 }}>
        <SpotIllustration name="heart-leash" size={240} />
        <Text variant="body" color="textMuted" align="center">
          Your profile stays hidden from Discover until you tap below.
        </Text>
      </View>
    </StepLayout>
  );
}
