import cablesData from './cables.json' with { type: 'json' };
import impedanceData from './impedance.json' with { type: 'json' };
import standardsData from './standards.json' with { type: 'json' };
import deratingData from './derating.json' with { type: 'json' };

import type { CableCatalogue, ImpedanceDatabase, StandardsData, DeratingDatabase } from './schema.js';

export * from './schema.js';

export const CABLES: CableCatalogue = cablesData as unknown as CableCatalogue;
export const CABLE_IMPEDANCE: ImpedanceDatabase = impedanceData as unknown as ImpedanceDatabase;
export const STANDARDS: StandardsData = standardsData as unknown as StandardsData;
export const DERATING: DeratingDatabase = deratingData as unknown as DeratingDatabase;

export const STANDARD_BREAKERS: number[] = STANDARDS.breakers;
export const STANDARD_CONDUITS = STANDARDS.conduits;
export const MAX_CONDUIT_FILL: number = STANDARDS.maxConduitFill;
export const REDUCED_NEUTRAL = STANDARDS.reducedNeutral;
export const STANDARD_ECC = STANDARDS.standardEcc;

