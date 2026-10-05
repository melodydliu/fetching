import type { Venue } from '@/domain/types';

/** Mock venue suggestions for "Plan a Pup Date". Real venue search comes later. */
export const MOCK_VENUES: readonly Venue[] = [
  {
    id: 'v-dog-park-1',
    kind: 'dog_park',
    name: 'Sunny Meadow Off-Leash Park',
    address: '120 Meadow Ln',
  },
  { id: 'v-dog-park-2', kind: 'dog_park', name: 'Harbor View Dog Run', address: '8 Harbor Way' },
  { id: 'v-cafe-1', kind: 'patio_cafe', name: 'The Wagging Tail Café', address: '45 Market St' },
  { id: 'v-cafe-2', kind: 'patio_cafe', name: 'Pawsitively Brewed', address: '312 Oak Ave' },
  {
    id: 'v-trail-1',
    kind: 'hiking_trail',
    name: 'Ridgeline Loop Trail',
    address: 'Ridge Rd trailhead',
  },
  { id: 'v-trail-2', kind: 'hiking_trail', name: 'Creekside Walk', address: 'Creek Park entrance' },
  { id: 'v-beach-1', kind: 'beach', name: 'Dog Beach at Kelp Cove', address: 'Kelp Cove Rd' },
  { id: 'v-store-1', kind: 'pet_store', name: 'Bark & Whiskers Supply', address: '77 Pine St' },
];

export const venuesFor = (kind: Venue['kind']): Venue[] =>
  MOCK_VENUES.filter((v) => v.kind === kind);
