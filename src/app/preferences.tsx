import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SaveBar } from '@/components/SaveBar';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { DealbreakerToggle } from '@/components/ui/DealbreakerToggle';
import { ErrorState } from '@/components/ui/ErrorState';
import { InfoTip } from '@/components/ui/InfoTip';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { Text } from '@/components/ui/Text';
import { config } from '@/config';
import {
  DOG_SIZES,
  ENERGY_LEVELS,
  INTEREST_OPTIONS,
  RELATIONSHIP_GOAL_LABELS,
  SPECIES,
  SPECIES_LABELS,
} from '@/config/reference';
import {
  DISTANCE_OPTIONS,
  type DealbreakerKey,
  draftFromUser,
  hasSelection,
  isDirty,
  type PreferencesDraft,
  resetDraft,
  toUserPatch,
} from '@/domain/preferencesDraft';
import type { Preferences, RelationshipGoal, User } from '@/domain/types';
import { useProfileActions } from '@/hooks/profileActions';
import { useViewerProfile } from '@/hooks/queries';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';
import { useTheme } from '@/hooks/useTheme';
import { useToastStore } from '@/state/toastStore';

const PREFERENCES_INFO =
  'These preferences are used to help us recommend who will be a good match for you. If a preference is set as a Dealbreaker, it means that only profiles with exact matches to your set preferences in that category will be shown.';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  /** Sits right after the title, e.g. the Dealbreaker switch. */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        gap: spacing.md,
        marginBottom: spacing.lg,
        paddingBottom: spacing.lg,
        // A thin rule under each section so the page is easy to scan.
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={styles.headerRow}>
        <Text variant="heading" style={styles.title}>
          {title}
        </Text>
        {trailing}
      </View>
      {children}
    </View>
  );
}

/** A smaller label inside a section, with its own Dealbreaker switch at the right. */
function FieldHeader({ label, trailing }: { label: string; trailing?: React.ReactNode }) {
  return (
    <View style={styles.headerRow}>
      <Text variant="smallStrong" color="textMuted" style={styles.title}>
        {label}
      </Text>
      {trailing}
    </View>
  );
}

const SHOW_OPTIONS = [
  { value: 'both', label: 'Everyone' },
  { value: 'pet_owners', label: 'Pet owners' },
  { value: 'animal_lovers', label: 'Animal lovers' },
] as const;

const PLURAL_SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dogs' },
  { value: 'cat', label: 'Cats' },
  { value: 'rabbit', label: 'Rabbits' },
  { value: 'bird', label: 'Birds' },
  { value: 'other', label: 'Other' },
] as const;

const SPECIES_OPTIONS = SPECIES.map((s) => ({ value: s, label: SPECIES_LABELS[s] }));

/** Who shows up in Discover. Edits a draft; nothing changes until you tap Save changes. */
export default function PreferencesScreen() {
  const profile = useViewerProfile();
  const { spacing } = useTheme();

  if (profile.data) return <PreferencesForm user={profile.data.user} />;
  return (
    <Screen scroll>
      <ScreenHeader title="Preferences" back />
      {profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={120} radius={20} />
          <Skeleton height={120} radius={20} />
        </View>
      )}
    </Screen>
  );
}

function PreferencesForm({ user }: { user: User }) {
  const { spacing } = useTheme();
  const { updateUser } = useProfileActions();
  const queryClient = useQueryClient();
  const toast = useToastStore((t) => t.show);
  const [draft, setDraft] = useState<PreferencesDraft>(() => draftFromUser(user));
  const [saving, setSaving] = useState(false);

  const { preferences: prefs, dealbreakers: db, allergies } = draft;
  const dirty = isDirty(user, draft);
  const { markSaved } = useDiscardGuard(dirty);

  const setPrefs = (patch: Partial<Preferences>) =>
    setDraft((d) => ({ ...d, preferences: { ...d.preferences, ...patch } }));
  const setDeal = (key: DealbreakerKey, value: boolean) =>
    setDraft((d) => ({ ...d, dealbreakers: { ...d.dealbreakers, [key]: value } }));
  const toggle = (key: DealbreakerKey, forLabel: string, description?: string) => (
    <DealbreakerToggle
      value={db[key]}
      disabled={!hasSelection(prefs, key, allergies)}
      onChange={(v) => setDeal(key, v)}
      forLabel={forLabel}
      description={description}
    />
  );

  const save = async () => {
    setSaving(true);
    await updateUser(toUserPatch(draft));
    // Who Discover shows depends on these, so refetch it.
    void queryClient.invalidateQueries({ queryKey: ['candidates'] });
    markSaved();
    toast('Preferences saved');
    router.back();
  };

  const distanceOptions = [...new Set([...DISTANCE_OPTIONS, prefs.maxDistanceMiles])]
    .sort((a, b) => a - b)
    .map((miles) => ({ value: String(miles), label: `${miles} mi` }));
  const interestOptions = INTEREST_OPTIONS.filter((o) => user.interestedIn.includes(o.value));
  const showsOwners = prefs.show !== 'animal_lovers';

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <ScreenHeader
          title="Preferences"
          back
          trailing={<InfoTip label="About preferences" text={PREFERENCES_INFO} />}
        />

        <Section title="Age">
          <View style={{ gap: spacing.xs }}>
            <Text variant="heading" align="center">
              {prefs.ageRange.min} – {prefs.ageRange.max}
            </Text>
            <RangeSlider
              minLabel="Youngest age"
              maxLabel="Oldest age"
              lo={config.minAge}
              hi={config.maxAge}
              value={prefs.ageRange}
              onChange={(ageRange) => setPrefs({ ageRange })}
            />
          </View>
        </Section>

        <Section title="Distance">
          <ChoiceChips
            label="Maximum distance"
            options={distanceOptions}
            value={[String(prefs.maxDistanceMiles)]}
            onChange={([miles]) => miles && setPrefs({ maxDistanceMiles: Number(miles) })}
          />
        </Section>

        {interestOptions.length > 1 ? (
          <Section title="Interested in">
            <ChoiceChips
              multiple
              label="Interested in"
              options={interestOptions}
              value={prefs.genders}
              // Always enforced, so at least one has to stay selected.
              onChange={(genders) => genders.length > 0 && setPrefs({ genders })}
            />
          </Section>
        ) : null}

        <Section
          title="Looking for"
          trailing={toggle(
            'relationshipGoals',
            'looking for',
            'Only show people who want the same',
          )}
        >
          <ChoiceChips
            multiple
            label="Looking for"
            options={(Object.keys(RELATIONSHIP_GOAL_LABELS) as RelationshipGoal[]).map((g) => ({
              value: g,
              label: RELATIONSHIP_GOAL_LABELS[g],
            }))}
            value={prefs.relationshipGoals}
            onChange={(relationshipGoals) => setPrefs({ relationshipGoals })}
          />
        </Section>

        <Section title="Show me" trailing={toggle('show', 'show me', 'Only show that group')}>
          <ChoiceChips
            label="Show me"
            options={SHOW_OPTIONS}
            value={[prefs.show]}
            onChange={([show]) => show && setPrefs({ show })}
          />
        </Section>

        {showsOwners ? (
          <>
            <Section title="Their pets">
              <FieldHeader label="Species" trailing={toggle('petSpecies', 'pet species')} />
              <ChoiceChips
                multiple
                label="Pet species"
                options={SPECIES_OPTIONS}
                value={prefs.petSpecies}
                onChange={(petSpecies) => setPrefs({ petSpecies })}
              />

              <FieldHeader
                label="Pet size"
                trailing={toggle('petSizes', 'pet size', 'Only show people with dogs that size')}
              />
              <ChoiceChips
                multiple
                label="Pet size"
                options={DOG_SIZES.map((s) => ({ value: s, label: cap(s) }))}
                value={prefs.petSizes}
                onChange={(petSizes) => setPrefs({ petSizes })}
              />

              <FieldHeader
                label="Energy level"
                trailing={toggle('petEnergy', 'pet energy level')}
              />
              <ChoiceChips
                multiple
                label="Pet energy level"
                options={ENERGY_LEVELS.map((e) => ({ value: e, label: cap(e) }))}
                value={prefs.petEnergy}
                onChange={(petEnergy) => setPrefs({ petEnergy })}
              />
            </Section>
          </>
        ) : null}

        <Section title="My pets">
          {user.kind === 'pet_owner' ? (
            <>
              <FieldHeader label="My pet isn't good with" />
              <ChoiceChips
                multiple
                label="My pet isn't good with"
                options={PLURAL_SPECIES_OPTIONS}
                value={db.petNotGoodWith}
                onChange={(petNotGoodWith) =>
                  setDraft((d) => ({ ...d, dealbreakers: { ...d.dealbreakers, petNotGoodWith } }))
                }
              />
            </>
          ) : null}

          <FieldHeader
            label="I'm allergic to"
            trailing={toggle('allergies', 'allergies', 'Hide people who have these animals')}
          />
          <ChoiceChips
            multiple
            label="I'm allergic to"
            options={SPECIES_OPTIONS}
            value={allergies}
            onChange={(next) => setDraft((d) => ({ ...d, allergies: next }))}
          />
        </Section>

        <Button
          label="Reset to defaults"
          variant="ghost"
          onPress={() => setDraft(resetDraft(user))}
        />
      </Screen>
      <SaveBar dirty={dirty} saving={saving} onSave={() => void save()} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 12 },
  // Left-aligned: the Dealbreaker switch sits right beside the title instead of at the far edge.
  title: { flexShrink: 1 },
});
