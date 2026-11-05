import { describe, it, expect } from 'vitest';
import {
  IEC_PROFILE,
  NEC_PROFILE,
  resolveCalculationProfile,
  exportCatalogueToCsv,
  parseCatalogueFromCsv,
  exportCatalogueToJson,
  parseCatalogueFromJson,
  type CableCatalogueEntry
} from '../src/standards/index.js';

describe('Standards and Cable Catalogue Manager', () => {
  const sampleCatalogue: CableCatalogueEntry[] = [
    {
      id: 1,
      manufacturer: 'Elsewedy Electric',
      tableKey: 'cu_xlpe_1core',
      sizeMm2: 25,
      groundAmp: 148,
      ductAmp: 118,
      airAmp: 140,
      diaMm: 13.5,
      resistance: 0.927,
      reactance: 0.08
    },
    {
      id: 2,
      manufacturer: 'Ducab',
      tableKey: 'cu_xlpe_4core',
      sizeMm2: 50,
      groundAmp: 195,
      ductAmp: 155,
      airAmp: 185,
      diaMm: 31.0,
      resistance: 0.493,
      reactance: 0.075
    }
  ];

  it('resolves standard profiles with overrides', () => {
    // Default IEC
    const iec = resolveCalculationProfile('iec');
    expect(iec.id).toBe('iec');
    expect(iec.breakerFactor).toBe(1.25);
    expect(iec.defaultAmbientAirTemp).toBe(40);

    // NEC Profile
    const nec = resolveCalculationProfile('nec');
    expect(nec.id).toBe('nec');
    expect(nec.defaultAmbientAirTemp).toBe(30);

    // Custom Profile with factor override
    const custom = resolveCalculationProfile('custom', {
      breakerFactor: 1.0,
      maxVoltageDropFeeder: 2.0,
      defaultAmbientAirTemp: 50
    });
    expect(custom.id).toBe('custom');
    expect(custom.breakerFactor).toBe(1.0);
    expect(custom.maxVoltageDropFeeder).toBe(2.0);
    expect(custom.defaultAmbientAirTemp).toBe(50);
  });

  it('exports and parses CSV catalogue with round-trip fidelity', () => {
    const csv = exportCatalogueToCsv(sampleCatalogue);
    expect(csv).toContain('manufacturer,tableKey,sizeMm2');
    expect(csv).toContain('Elsewedy Electric');
    expect(csv).toContain('Ducab');
    expect(csv).toContain('0.927');
    expect(csv).toContain('0.075');

    const parsed = parseCatalogueFromCsv(csv);
    expect(parsed.length).toBe(2);
    expect(parsed[0].manufacturer).toBe('Elsewedy Electric');
    expect(parsed[0].sizeMm2).toBe(25);
    expect(parsed[0].resistance).toBe(0.927);
    expect(parsed[0].reactance).toBe(0.08);

    expect(parsed[1].manufacturer).toBe('Ducab');
    expect(parsed[1].sizeMm2).toBe(50);
    expect(parsed[1].resistance).toBe(0.493);
    expect(parsed[1].reactance).toBe(0.075);
  });

  it('exports and parses JSON catalogue with round-trip fidelity', () => {
    const jsonStr = exportCatalogueToJson(sampleCatalogue);
    expect(jsonStr).toContain('"Elsewedy Electric"');
    expect(jsonStr).toContain('"Ducab"');

    const parsed = parseCatalogueFromJson(jsonStr);
    expect(parsed.length).toBe(2);
    expect(parsed[0].manufacturer).toBe('Elsewedy Electric');
    expect(parsed[1].sizeMm2).toBe(50);
  });
});
