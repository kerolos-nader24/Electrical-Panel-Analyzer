/**
 * Calculation Standard Profiles
 * Pre-configured engineering profiles for IEC 60364, NEC 2023 (NFPA 70), and Custom.
 */

import type { CalculationProfile, StandardProfileId } from './types.js';

export const IEC_PROFILE: CalculationProfile = {
  id: 'iec',
  name: 'IEC 60364 Standard Profile',
  codeReference: 'IEC 60364 / BS 7671',
  breakerFactor: 1.25,
  maxVoltageDropFeeder: 3.0,
  maxVoltageDropBranch: 4.0,
  maxVoltageDropTotal: 5.0,
  defaultAmbientAirTemp: 40,
  defaultAmbientGroundTemp: 20,
  defaultSoilResistivity: 1.5,
  standardBreakers: [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600],
  motorConductorFactor: 1.25,
  motorOcpdBreakerFactor: 2.50,
  motorOverloadFactor: 1.15
};

export const NEC_PROFILE: CalculationProfile = {
  id: 'nec',
  name: 'NEC 2023 / NFPA 70 Profile',
  codeReference: 'NEC Article 215 / 430 / 440',
  breakerFactor: 1.25,
  maxVoltageDropFeeder: 3.0,
  maxVoltageDropBranch: 3.0,
  maxVoltageDropTotal: 5.0,
  defaultAmbientAirTemp: 30,
  defaultAmbientGroundTemp: 30,
  defaultSoilResistivity: 1.5,
  standardBreakers: [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 500, 600, 800, 1000, 1200, 1600],
  motorConductorFactor: 1.25,
  motorOcpdBreakerFactor: 2.50,
  motorOverloadFactor: 1.15
};

export const CUSTOM_PROFILE: CalculationProfile = {
  id: 'custom',
  name: 'Custom Engineering Specification',
  codeReference: 'Client Technical Specification',
  breakerFactor: 1.25,
  maxVoltageDropFeeder: 2.5,
  maxVoltageDropBranch: 2.5,
  maxVoltageDropTotal: 4.0,
  defaultAmbientAirTemp: 45,
  defaultAmbientGroundTemp: 25,
  defaultSoilResistivity: 2.0,
  standardBreakers: [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600],
  motorConductorFactor: 1.25,
  motorOcpdBreakerFactor: 2.50,
  motorOverloadFactor: 1.15
};

export function resolveCalculationProfile(
  profileId: StandardProfileId = 'iec',
  overrides?: Partial<CalculationProfile>
): CalculationProfile {
  let base: CalculationProfile;
  if (profileId === 'nec') {
    base = { ...NEC_PROFILE };
  } else if (profileId === 'custom') {
    base = { ...CUSTOM_PROFILE };
  } else {
    base = { ...IEC_PROFILE };
  }

  if (overrides) {
    return {
      ...base,
      ...overrides,
      standardBreakers: overrides.standardBreakers || base.standardBreakers
    };
  }

  return base;
}
