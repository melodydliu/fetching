import type { DogSize, EnergyLevel, Pet, Profile, Species } from '../types';
import { MATCHING_CONFIG, type MatchingConfig } from './config';
import type { Compatibility, CompatibilityLabel, CompatibilityReason } from './types';

const PLURAL: Record<Species, string> = {
  dog: 'dogs',
  cat: 'cats',
  rabbit: 'rabbits',
  bird: 'birds',
  other: 'other pets',
};

const ENERGY_ORDER: EnergyLevel[] = ['low', 'medium', 'high'];
const SIZE_ORDER: DogSize[] = ['small', 'medium', 'large', 'giant'];

/** One scored aspect of compatibility. */
interface Component {
  key: keyof MatchingConfig['pet']['weights'];
  /** 0–100. */
  score: number;
  reasons: CompatibilityReason[];
}

const positive = (text: string): CompatibilityReason => ({ text, tone: 'positive' });
const caution = (text: string): CompatibilityReason => ({ text, tone: 'caution' });

const listWords = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const unique = <T>(items: T[]) => [...new Set(items)];

export function compatibilityLabel(
  score: number,
  cfg: MatchingConfig = MATCHING_CONFIG,
): CompatibilityLabel {
  if (score >= cfg.labels.great) return 'great';
  if (score >= cfg.labels.good) return 'good';
  if (score >= cfg.labels.okay) return 'okay';
  return 'caution';
}

/** "Good with dogs/cats" cross-checks. Only dogs and cats have these fields. */
function goodWithKey(species: Species): 'dogs' | 'cats' | null {
  return species === 'dog' ? 'dogs' : species === 'cat' ? 'cats' : null;
}

/**
 * Does each pet get along with the other household's animals?
 * A single "no" is a real problem; "unsure" and species we have no data for are skipped.
 */
function speciesComponent(
  viewer: Profile,
  candidate: Profile,
  cfg: MatchingConfig,
): Component | null {
  let yes = 0;
  let no = 0;
  const reasons: CompatibilityReason[] = [];

  const judge = (owner: 'Your' | 'Their', pet: Pet, other: Pet) => {
    const key = goodWithKey(other.species);
    if (!key) return;
    const value = pet.goodWith[key];
    if (value === 'unsure') return;
    if (value === 'yes') {
      yes += 1;
      // "dog is dog-friendly" reads oddly, so same-species pairs get a natural phrasing.
      reasons.push(
        positive(
          pet.species === other.species
            ? `${owner} ${pet.species} gets along with other ${PLURAL[other.species]}`
            : `${owner} ${pet.species} is ${other.species}-friendly`,
        ),
      );
    } else {
      no += 1;
      reasons.push(caution(`${owner} ${pet.species} isn't good with ${PLURAL[other.species]}`));
    }
  };

  for (const mine of viewer.pets) {
    for (const theirs of candidate.pets) {
      judge('Your', mine, theirs);
      judge('Their', theirs, mine);
    }
  }
  if (yes + no === 0) return null;

  const raw = (100 * yes) / (yes + no);
  const score = no > 0 ? Math.min(cfg.pet.speciesConflictCeiling, raw) : raw;
  const dedupe = (rs: CompatibilityReason[]) => [...new Map(rs.map((r) => [r.text, r])).values()];
  return {
    key: 'species',
    score,
    reasons: [
      ...dedupe(reasons.filter((r) => r.tone === 'caution')).slice(0, 2),
      ...dedupe(reasons.filter((r) => r.tone === 'positive')).slice(0, 2),
    ],
  };
}

/** Allergies vs the other household's species. Only a conflict produces a component. */
function allergyComponent(viewer: Profile, candidate: Profile): Component | null {
  const reasons: CompatibilityReason[] = [];
  const theirSpecies = unique(candidate.pets.map((p) => p.species));
  const mySpecies = unique(viewer.pets.map((p) => p.species));

  for (const s of viewer.user.allergies.filter((a) => theirSpecies.includes(a))) {
    reasons.push(
      caution(`You're allergic to ${PLURAL[s]}, and ${candidate.user.firstName} has one`),
    );
  }
  for (const s of candidate.user.allergies.filter((a) => mySpecies.includes(a))) {
    reasons.push(
      caution(`${candidate.user.firstName} is allergic to ${PLURAL[s]}, and you have one`),
    );
  }
  return reasons.length ? { key: 'allergy', score: 0, reasons } : null;
}

/** Best-matching pair of pets by energy, since a multi-pet home only needs one good fit. */
function energyComponent(
  viewer: Profile,
  candidate: Profile,
  cfg: MatchingConfig,
): Component | null {
  let best: { score: number; diff: number; a: Pet; b: Pet } | null = null;
  for (const a of viewer.pets) {
    for (const b of candidate.pets) {
      const diff = Math.abs(ENERGY_ORDER.indexOf(a.energy) - ENERGY_ORDER.indexOf(b.energy));
      const score = cfg.pet.energyScores[diff] ?? 0;
      if (!best || score > best.score || (score === best.score && a.species === b.species)) {
        best = { score, diff, a, b };
      }
    }
  }
  if (!best) return null;
  const reasons: CompatibilityReason[] = [];
  if (best.diff === 0) {
    const what = best.a.species === best.b.species ? PLURAL[best.a.species] : 'pets';
    reasons.push(positive(`Both have ${best.a.energy}-energy ${what}`));
  } else if (best.diff === 2) {
    reasons.push(caution('Very different energy levels'));
  }
  return { key: 'energy', score: best.score, reasons };
}

/** Dog-vs-dog size fit, best pair. Dogs with no recorded size are ignored. */
function sizeComponent(viewer: Profile, candidate: Profile, cfg: MatchingConfig): Component | null {
  let best: { score: number; diff: number; size: DogSize } | null = null;
  for (const a of viewer.pets) {
    for (const b of candidate.pets) {
      if (a.species !== 'dog' || b.species !== 'dog' || !a.size || !b.size) continue;
      const diff = Math.abs(SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
      const score = cfg.pet.sizeScores[diff] ?? 0;
      if (!best || score > best.score) best = { score, diff, size: a.size };
    }
  }
  if (!best) return null;
  const reasons: CompatibilityReason[] = [];
  if (best.diff === 0) reasons.push(positive(`Both have ${best.size} dogs`));
  else if (best.diff >= 2) reasons.push(caution('Big size difference between your dogs'));
  return { key: 'size', score: best.score, reasons };
}

/**
 * Animal-lover preferences vs the other person's pets, or two lovers' shared favorites.
 * Returns the component plus whether the lover said they are not open to these pets.
 */
function loverComponent(
  viewer: Profile,
  candidate: Profile,
  cfg: MatchingConfig,
): { component: Component; notOpen: boolean } | null {
  const viewerLover = viewer.user.kind === 'animal_lover' ? viewer.user.animalLover : undefined;
  const candidateLover =
    candidate.user.kind === 'animal_lover' ? candidate.user.animalLover : undefined;

  if (viewerLover && candidateLover) {
    const shared = viewerLover.lovedSpecies.filter((s) => candidateLover.lovedSpecies.includes(s));
    if (shared.length === 0) return null;
    return {
      notOpen: false,
      component: {
        key: 'lover',
        score: cfg.pet.bothLoveScore,
        reasons: [positive(`You both love ${listWords(shared.map((s) => PLURAL[s]))}`)],
      },
    };
  }

  // Exactly one side is a lover, the other has pets.
  const lover = viewerLover ?? candidateLover;
  const owner = viewerLover ? candidate : viewer;
  if (!lover || owner.pets.length === 0) return null;

  const who = viewerLover ? 'You' : candidate.user.firstName;
  const are = viewerLover ? "aren't" : "isn't";
  const petSpecies = unique(owner.pets.map((p) => p.species));
  const open = petSpecies.filter((s) => lover.openToPetSpecies.includes(s));
  const loved = petSpecies.filter((s) => lover.lovedSpecies.includes(s));

  let score = (100 * open.length) / petSpecies.length;
  const reasons: CompatibilityReason[] = [];
  if (open.length === petSpecies.length) {
    reasons.push(
      positive(
        `${who} ${viewerLover ? 'are' : 'is'} open to dating someone with ${listWords(petSpecies.map((s) => PLURAL[s]))}`,
      ),
    );
  } else {
    const closed = petSpecies.filter((s) => !open.includes(s));
    reasons.push(
      caution(
        `${who} ${are} open to dating someone with ${listWords(closed.map((s) => PLURAL[s]))}`,
      ),
    );
  }
  if (loved.length) {
    score = Math.max(score, cfg.pet.lovedSpeciesFloor);
    reasons.push(
      positive(
        `${who} ${viewerLover ? 'love' : 'loves'} ${listWords(loved.map((s) => PLURAL[s]))}`,
      ),
    );
  }
  return {
    component: { key: 'lover', score, reasons },
    notOpen: open.length === 0 && loved.length === 0,
  };
}

/**
 * Pet compatibility between two profiles, 0–100, with reasons.
 * Components that can't be judged (no pets, "unsure", unknown size) are skipped rather than
 * scored low, so missing information never counts against anyone.
 */
export function petCompatibility(
  viewer: Profile,
  candidate: Profile,
  cfg: MatchingConfig = MATCHING_CONFIG,
): Compatibility {
  const lover = loverComponent(viewer, candidate, cfg);
  const species = speciesComponent(viewer, candidate, cfg);
  const allergy = allergyComponent(viewer, candidate);
  const components: Component[] = [
    species,
    allergy,
    energyComponent(viewer, candidate, cfg),
    sizeComponent(viewer, candidate, cfg),
    lover?.component ?? null,
  ].filter((c): c is Component => c !== null);

  if (components.length === 0) {
    return {
      score: cfg.pet.neutral,
      label: compatibilityLabel(cfg.pet.neutral, cfg),
      reasons: [],
      informative: false,
    };
  }

  let totalWeight = 0;
  let weighted = 0;
  for (const c of components) {
    const w = cfg.pet.weights[c.key];
    totalWeight += w;
    weighted += w * c.score;
  }
  let score = weighted / totalWeight;
  if (allergy) score = Math.min(score, cfg.pet.caps.allergy);
  if (species && species.score <= cfg.pet.speciesConflictCeiling) {
    score = Math.min(score, cfg.pet.caps.species);
  }
  if (lover?.notOpen) score = Math.min(score, cfg.pet.caps.loverNotOpen);
  score = Math.round(score);

  // Cautions first so the badge never buries a real problem.
  const all = components.flatMap((c) => c.reasons);
  const reasons = [
    ...all.filter((r) => r.tone === 'caution'),
    ...all.filter((r) => r.tone === 'positive'),
  ];
  return { score, label: compatibilityLabel(score, cfg), reasons, informative: true };
}
