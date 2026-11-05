/**
 * Branded nominal types for physical electrical units to prevent unit confusion bugs at compile-time.
 */

declare const BrandAmps: unique symbol;
export type Amps = number & { readonly [BrandAmps]: true };

declare const BrandVolts: unique symbol;
export type Volts = number & { readonly [BrandVolts]: true };

declare const BrandKVA: unique symbol;
export type kVA = number & { readonly [BrandKVA]: true };

declare const BrandKW: unique symbol;
export type kW = number & { readonly [BrandKW]: true };

declare const BrandHP: unique symbol;
export type HP = number & { readonly [BrandHP]: true };

declare const BrandSquareMm: unique symbol;
export type mm2 = number & { readonly [BrandSquareMm]: true };

declare const BrandOhmsPerKm: unique symbol;
export type OhmsPerKm = number & { readonly [BrandOhmsPerKm]: true };

declare const BrandMeters: unique symbol;
export type Meters = number & { readonly [BrandMeters]: true };

declare const BrandPercentage: unique symbol;
export type Percentage = number & { readonly [BrandPercentage]: true };

// Type assertion helpers
export const asAmps = (n: number): Amps => n as Amps;
export const asVolts = (n: number): Volts => n as Volts;
export const asKVA = (n: number): kVA => n as kVA;
export const asKW = (n: number): kW => n as kW;
export const asHP = (n: number): HP => n as HP;
export const asMm2 = (n: number): mm2 => n as mm2;
export const asOhmsPerKm = (n: number): OhmsPerKm => n as OhmsPerKm;
export const asMeters = (n: number): Meters => n as Meters;
export const asPercentage = (n: number): Percentage => n as Percentage;
