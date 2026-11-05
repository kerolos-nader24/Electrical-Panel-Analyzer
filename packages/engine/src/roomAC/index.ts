import { asAmps, type Amps } from '../types/units.js';

export interface RoomACInputs {
  /** Nameplate rated current in Amperes */
  rating: number;
  /** True if other loads share this circuit (general-use receptacle); False if sole load */
  hasOtherLoads: boolean;
}

export interface RoomACOutputs {
  /** Applied multiplier factor (1.25 for sole load, 2.00 for shared circuit) */
  factor: number;
  /** Required branch-circuit ampacity in Amperes */
  requiredAmpacity: Amps;
}

/**
 * Calculates branch-circuit rating for cord-and-plug connected room air conditioners per NEC Article 440 Part VII.
 * Sizing limits: single-phase units rated <= 40A, <= 250V.
 */
export function calculateRoomAC(inputs: RoomACInputs): RoomACOutputs {
  const rating = Math.max(0, inputs.rating || 0);

  // NEC 440.62(B): Where sole load on circuit, rating shall not exceed 80% of branch-circuit rating (1.25x)
  // NEC 440.62(C): Where other loads share circuit, rating shall not exceed 50% of branch-circuit rating (2.00x)
  const factor = inputs.hasOtherLoads ? 2.00 : 1.25;
  const requiredAmpacity = factor * rating;

  return {
    factor,
    requiredAmpacity: asAmps(requiredAmpacity)
  };
}
