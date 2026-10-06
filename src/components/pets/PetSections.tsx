import { View } from 'react-native';
import {
  DOG_SIZES,
  ENERGY_LEVELS,
  PERSONALITY_TAGS,
  SPECIES,
  SPECIES_LABELS,
} from '@/config/reference';
import type { PetDraft } from '@/domain/petDraft';
import type { DogSize, EnergyLevel, Species, Tri } from '@/domain/types';
import { useTheme } from '@/hooks/useTheme';
import { PhotoGrid } from '../PhotoGrid';
import { ChoiceChips } from '../ui/ChoiceChips';
import { Text } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { BreedField } from './BreedField';

/**
 * A pet profile is split into four sections. Onboarding shows one per screen;
 * the pet editor stacks all four on one form.
 */
interface SectionProps {
  draft: PetDraft;
  onChange: (patch: Partial<PetDraft>) => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Label({ children }: { children: string }) {
  return (
    <Text variant="smallStrong" color="textMuted">
      {children}
    </Text>
  );
}

export function PetBasicsSection({ draft, onChange }: SectionProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xl }}>
      <TextField
        label="Name"
        value={draft.name}
        onChangeText={(name) => onChange({ name })}
        placeholder="Biscuit"
        autoCapitalize="words"
        maxLength={30}
        returnKeyType="done"
      />
      <View style={{ gap: spacing.sm }}>
        <Label>Species</Label>
        <ChoiceChips
          label="Species"
          options={SPECIES.map((s) => ({ value: s, label: SPECIES_LABELS[s] }))}
          value={[draft.species]}
          onChange={([species]) =>
            onChange({
              species: species as Species,
              // Breeds and sizes don't carry across species.
              breed: species === draft.species ? draft.breed : '',
              size: species === 'dog' ? draft.size : null,
            })
          }
        />
      </View>
    </View>
  );
}

export function PetDetailsSection({ draft, onChange }: SectionProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xl }}>
      <BreedField
        species={draft.species}
        value={draft.breed}
        onChange={(breed) => onChange({ breed })}
      />
      <TextField
        label="Age in years"
        hint="Under a year old? Enter 0."
        value={draft.age}
        onChangeText={(age) => onChange({ age: age.replace(/[^0-9]/g, '') })}
        keyboardType="number-pad"
        maxLength={2}
        placeholder="3"
      />
      {draft.species === 'dog' && (
        <View style={{ gap: spacing.sm }}>
          <Label>Size</Label>
          <ChoiceChips
            label="Dog size"
            options={DOG_SIZES.map((s) => ({ value: s, label: cap(s) }))}
            value={draft.size ? [draft.size] : []}
            onChange={([size]) => onChange({ size: size as DogSize })}
          />
        </View>
      )}
    </View>
  );
}

const TRI_OPTIONS: { value: Tri; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
];

export function PetVibeSection({ draft, onChange }: SectionProps) {
  const { spacing } = useTheme();
  const goodWith = (key: 'dogs' | 'cats' | 'kids', label: string) => (
    <View key={key} style={{ gap: spacing.sm }}>
      <Label>{label}</Label>
      <ChoiceChips
        label={label}
        options={TRI_OPTIONS}
        value={[draft.goodWith[key]]}
        onChange={([v]) => onChange({ goodWith: { ...draft.goodWith, [key]: v as Tri } })}
      />
    </View>
  );
  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Label>Energy level</Label>
        <ChoiceChips
          label="Energy level"
          options={ENERGY_LEVELS.map((e) => ({ value: e, label: cap(e) }))}
          value={[draft.energy]}
          onChange={([energy]) => onChange({ energy: energy as EnergyLevel })}
        />
      </View>
      {goodWith('dogs', 'Good with dogs?')}
      {goodWith('cats', 'Good with cats?')}
      {goodWith('kids', 'Good with kids?')}
      <View style={{ gap: spacing.sm }}>
        <Label>Personality (pick a few)</Label>
        <ChoiceChips
          multiple
          label="Personality tags"
          options={PERSONALITY_TAGS.map((t) => ({ value: t, label: cap(t) }))}
          value={draft.personalityTags}
          onChange={(personalityTags) => onChange({ personalityTags })}
        />
      </View>
    </View>
  );
}

interface PhotosSectionProps extends SectionProps {
  onAddPress: () => void;
  adding?: boolean;
}

export function PetPhotosSection({ draft, onChange, onAddPress, adding }: PhotosSectionProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <PhotoGrid
        photos={draft.photos}
        max={6}
        noun="pet photo"
        captions
        adding={adding}
        onAddPress={onAddPress}
        onChange={(photos) => onChange({ photos })}
      />
      <Text variant="small" color="textMuted">
        {draft.photos.length < 3
          ? `${3 - draft.photos.length} more to go. Tap a photo to add a caption. Hold and drag to reorder.`
          : 'Tap a photo to add a caption. Hold and drag to reorder. The first photo is the main one.'}
      </Text>
    </View>
  );
}
