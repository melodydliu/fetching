export interface MatchingConfig {
  rank: {
    weights: {
      pet: number;
      goals: number;
      distance: number;
      completeness: number;
      recency: number;
      preferences: number;
    };
    boosts: { likedYou: number; treat: number };
    recency: { fullHours: number; zeroHours: number };
    neutral: number;
  };
  pet: {
    neutral: number;
    weights: { species: number; allergy: number; energy: number; size: number; lover: number };
    caps: { allergy: number; species: number; loverNotOpen: number };
    speciesConflictCeiling: number;
    energyScores: readonly number[];
    sizeScores: readonly number[];
    bothLoveScore: number;
    lovedSpeciesFloor: number;
  };
  labels: { great: number; good: number; okay: number };
}

/**
 * Every tunable number in matching lives here. Nothing else hard-codes a weight.
 * Rank weights sum to 1; pet weights are relative (only applicable components count).
 */
export const MATCHING_CONFIG: MatchingConfig = {
  rank: {
    weights: {
      pet: 0.35,
      goals: 0.15,
      distance: 0.15,
      completeness: 0.1,
      recency: 0.15,
      preferences: 0.1,
    },
    /** Added on top of the blended 0–100 score. */
    boosts: { likedYou: 20, treat: 30 },
    /** Activity: full marks within `fullHours`, fading linearly to zero at `zeroHours`. */
    recency: { fullHours: 24, zeroHours: 14 * 24 },
    /** Score used when a signal is unknown (never a penalty). */
    neutral: 50,
  },
  pet: {
    /** Pet score when there is nothing to compare (also what "unsure" collapses to). */
    neutral: 60,
    weights: { species: 0.3, allergy: 0.3, energy: 0.15, size: 0.1, lover: 0.3 },
    /** Final-score ceilings when a hard conflict exists. */
    caps: { allergy: 25, species: 45, loverNotOpen: 40 },
    /** Species component ceiling when any pair is "not good with". */
    speciesConflictCeiling: 30,
    /** Indexed by energy-level distance (0, 1, 2). */
    energyScores: [100, 60, 20],
    /** Indexed by dog-size distance (0–3). */
    sizeScores: [100, 75, 35, 10],
    bothLoveScore: 85,
    lovedSpeciesFloor: 90,
  },
  /** Minimum pet score for each badge label. */
  labels: { great: 80, good: 60, okay: 40 },
};
