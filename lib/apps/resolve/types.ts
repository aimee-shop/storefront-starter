import type { ActiveStorefrontMount } from '../types';

export interface ActiveMountSource {
  listStorefrontPackages(): Promise<ActiveStorefrontMount[]>;
}
