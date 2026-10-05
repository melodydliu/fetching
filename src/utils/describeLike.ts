import { promptById } from '@/config/prompts';
import type { Like, Profile } from '@/domain/types';

/** Human-readable "what they liked", resolved against the recipient's own profile. */
export function describeLikeTarget(like: Like, recipient: Profile): string {
  const { target } = like;
  if (target.type === 'photo') return 'Liked your photo';
  if (target.type === 'pet') {
    const pet = recipient.pets.find((p) => p.id === target.id);
    return pet ? `Liked ${pet.name}` : 'Liked your pet';
  }
  const answer = recipient.user.promptAnswers.find((a) => a.id === target.id);
  const prompt = answer && promptById(answer.promptId);
  return prompt ? `Liked your answer to “${prompt.text}”` : 'Liked your prompt';
}
