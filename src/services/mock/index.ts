import type { Services } from '../types';
import { createMockAuth } from './auth';
import { createMockChat } from './chat';
import { MockDb } from './db';
import { createMockDevTools } from './dev';
import { createMockDiscovery } from './discovery';
import { createMockLikes } from './likes';
import { createMockMatches } from './matches';
import { createMockMedia } from './media';
import { createMockPets } from './pets';
import { createMockUsers } from './users';

export function createMockServices(db: MockDb = new MockDb()): Services {
  return {
    auth: createMockAuth(db),
    users: createMockUsers(db),
    pets: createMockPets(db),
    discovery: createMockDiscovery(db),
    likes: createMockLikes(db),
    matches: createMockMatches(db),
    chat: createMockChat(db),
    media: createMockMedia(db),
    dev: createMockDevTools(db),
  };
}

export { MockDb };
