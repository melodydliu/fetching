import type { Prompt } from '@/domain/types';

/** Prompt catalog. Users answer between `config.minPromptAnswers` and `config.maxPromptAnswers` of these. */
export const PROMPTS: readonly Prompt[] = [
  // Pet prompts (kept species-neutral so they work for every household)
  { id: 'pet-love-language', category: 'pet', text: "My pet's love language is…" },
  { id: 'pet-judge', category: 'pet', text: 'My pet will judge you if…' },
  { id: 'pet-win', category: 'pet', text: 'The way to win me (and my pet) over…' },
  { id: 'pet-homecoming', category: 'pet', text: 'The day I brought my pet home…' },
  { id: 'pet-zoomies', category: 'pet', text: "My pet's zoomies happen when…" },
  { id: 'pet-talent', category: 'pet', text: "My pet's most surprising talent is…" },
  { id: 'pet-habit', category: 'pet', text: "My pet's worst habit is…" },
  { id: 'pet-couch', category: 'pet', text: 'My pet thinks the couch belongs to…' },
  { id: 'pet-bribe', category: 'pet', text: 'You can bribe my pet with…' },
  {
    id: 'pet-first-impression',
    category: 'pet',
    text: "My pet's first impression of you will be…",
  },
  { id: 'pet-nicknames', category: 'pet', text: 'My pet answers to many names, including…' },
  { id: 'pet-wander', category: 'pet', text: 'Our favorite place to wander is…' },
  { id: 'pet-vet', category: 'pet', text: 'Vet visits with my pet go like…' },
  { id: 'pet-camera-roll', category: 'pet', text: 'My camera roll is 90% my pet…' },
  { id: 'pet-know-first', category: 'pet', text: 'Before you meet my pet, know that…' },
  // Personal prompts
  { id: 'ideal-sunday', category: 'personal', text: 'Our ideal Sunday looks like…' },
  { id: 'perfect-first-date', category: 'personal', text: 'A perfect first date includes…' },
  { id: 'simple-pleasures', category: 'personal', text: 'My simplest pleasures are…' },
  { id: 'weirdly-good', category: 'personal', text: "I'm weirdly good at…" },
  { id: 'green-flag', category: 'personal', text: 'A green flag I look for is…' },
  { id: 'know-its-love', category: 'personal', text: "I'll know it's love when…" },
  { id: 'competitive', category: 'personal', text: 'I get way too competitive about…' },
  { id: 'hot-take', category: 'personal', text: 'My most controversial opinion is…' },
  { id: 'dating-me', category: 'personal', text: 'Dating me is like…' },
  { id: 'get-along', category: 'personal', text: "We'll get along if…" },
  { id: 'looking-for', category: 'personal', text: "I'm looking for someone who…" },
  { id: 'best-advice', category: 'personal', text: 'The best advice I ever got…' },
  { id: 'go-feral', category: 'personal', text: 'I go feral for…' },
  { id: 'weekends', category: 'personal', text: 'On weekends you can find me…' },
  { id: 'good-day', category: 'personal', text: 'A really good day ends with…' },
];

export const promptById = (id: string): Prompt | undefined => PROMPTS.find((p) => p.id === id);
