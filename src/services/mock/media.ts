import type { MediaService } from '../types';
import { MockDb, simulate } from './db';

/** Mock "upload": the local URI is used directly as the photo URL. */
export function createMockMedia(db: MockDb): MediaService {
  return {
    upload: (localUri) => simulate(() => ({ id: db.nextId('ph'), url: localUri })),
    remove: () => simulate(() => undefined),
  };
}
