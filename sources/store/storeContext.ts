import type { AudioLabGet, AudioLabSet } from './audioLabStoreTypes';
import type { LoadCoordinator } from './loadCoordinator';
import type { StatusController } from './statusController';

export interface StoreContext {
  set: AudioLabSet;
  get: AudioLabGet;
  loads: LoadCoordinator;
  status: StatusController;
}
