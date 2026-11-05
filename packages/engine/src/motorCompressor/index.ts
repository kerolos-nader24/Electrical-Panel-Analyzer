import { asAmps, type Amps } from '../types/units.js';

export interface MotorCompressorInputs {
  /** Rated-Load Current in Amperes */
  rlc: number;
  /** Branch-Circuit Selection Current in Amperes (optional, enter 0 or omit if not marked) */
  bsc?: number;
  /** Locked-Rotor Current in Amperes */
  lrc?: number;
  /** Minimum Circuit Ampacity marked on nameplate (optional, enter 0 or omit if not marked) */
  mca?: number;
}

export interface MotorCompressorOutputs {
  /** Base sizing current: max(RLC, BSC) */
  baseCurrent: Amps;
  /** Minimum disconnecting means ampere rating (NEC 440.12(A)(1)) */
  disconnectRating: Amps;
  /** Step 1 starting OCPD rating (NEC 440.22(A)) */
  ocpdStep1: Amps;
  /** Step 3 OCPD rating if time-current curves intersect (NEC 440.22(A) Exception 2) */
  ocpdStep3: Amps;
  /** Minimum conductor ampacity (NEC 440.32 & NEC 440.35) */
  conductorAmpacity: Amps;
  /** Conductor ampacity between controller and motor for Wye-start/Delta-run (NEC 440.32) */
  wyeDeltaConductorAmpacity: Amps;
  /** Minimum continuous-duty FLC rating of controller (NEC 440.41(A)) */
  controllerFlc: Amps;
  /** Minimum LRC rating of controller (NEC 440.41(A)) */
  controllerLrc: Amps;
  /** Overload protection options (NEC 440.52(A)) */
  overload: {
    /** Option 1 — separate overload relay (NEC 440.52(A)(1)): <= 140% of RLC */
    separateRelay: Amps;
    /** Option 2 — thermal protector (NEC 440.52(A)(2)): <= 156% of max(RLC, BSC) */
    thermalProtector: Amps;
    /** Option 3 — fuse or inverse-time circuit breaker (NEC 440.52(A)(3)): <= 125% of RLC */
    fuseOrBreaker: Amps;
    /** Option 4 — manufacturer special protective system (NEC 440.52(A)(4)): <= 156% of max(RLC, BSC) */
    specialProtectiveSystem: Amps;
  };
}

/**
 * Sizes protection, disconnects, conductors, and controllers for a single hermetic motor-compressor per NEC Article 440.
 */
export function calculateMotorCompressor(inputs: MotorCompressorInputs): MotorCompressorOutputs {
  const rlc = Math.max(0, inputs.rlc || 0);
  const bsc = Math.max(0, inputs.bsc || 0);
  const lrc = Math.max(0, inputs.lrc || 0);
  const mca = Math.max(0, inputs.mca || 0);

  // NEC 440.12(A)(1) & NEC 440.4: Base current is the greater of RLC or BSC
  const I = Math.max(rlc, bsc);

  // NEC 440.12(A)(1): Disconnecting means ampere rating >= 115% of RLC or BSC, whichever is greater
  const disconnectRating = 1.15 * I;

  // NEC 440.22(A): Branch-circuit short-circuit & ground-fault protection <= 175% of RLC or BSC
  const ocpdStep1 = 1.75 * I;

  // NEC 440.22(A) Exception 2: May be increased to not exceed 225% if starting current prevents holding
  const ocpdStep3 = 2.25 * I;

  // NEC 440.32: Conductors shall have an ampacity >= 125% of RLC or BSC.
  // NEC 440.35: Conductors shall not be smaller than nameplate MCA where marked.
  const conductorAmpacity = Math.max(mca, 1.25 * I);

  // NEC 440.32: For Wye-start / Delta-run, conductors between controller and motor >= 72% of RLC or BSC
  const wyeDeltaConductorAmpacity = 0.72 * I;

  // NEC 440.41(A): Controller continuous-duty full-load current rating >= max(RLC, BSC)
  const controllerFlc = I;

  // NEC 440.41(A): Controller locked-rotor current rating >= entered LRC
  const controllerLrc = lrc;

  // NEC 440.52(A): Overload protection
  // Option 1: NEC 440.52(A)(1) <= 140% of RLC
  const separateRelay = 1.40 * rlc;
  // Option 2: NEC 440.52(A)(2) <= 156% of max(RLC, BSC)
  const thermalProtector = 1.56 * I;
  // Option 3: NEC 440.52(A)(3) <= 125% of RLC
  const fuseOrBreaker = 1.25 * rlc;
  // Option 4: NEC 440.52(A)(4) <= 156% of max(RLC, BSC)
  const specialProtectiveSystem = 1.56 * I;

  return {
    baseCurrent: asAmps(I),
    disconnectRating: asAmps(disconnectRating),
    ocpdStep1: asAmps(ocpdStep1),
    ocpdStep3: asAmps(ocpdStep3),
    conductorAmpacity: asAmps(conductorAmpacity),
    wyeDeltaConductorAmpacity: asAmps(wyeDeltaConductorAmpacity),
    controllerFlc: asAmps(controllerFlc),
    controllerLrc: asAmps(controllerLrc),
    overload: {
      separateRelay: asAmps(separateRelay),
      thermalProtector: asAmps(thermalProtector),
      fuseOrBreaker: asAmps(fuseOrBreaker),
      specialProtectiveSystem: asAmps(specialProtectiveSystem)
    }
  };
}
