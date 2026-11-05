import { describe, it, expect } from 'vitest';
import { analyzeDistributionHierarchy, type PanelNode } from '../src/distributionHierarchy/index.js';

describe('Distribution Hierarchy Engine (MDB -> SMDB -> DB)', () => {
  it('correctly propagates loads upward in a 3-tier tree', () => {
    // MDB feeds SMDB-1 (and has 10 kVA direct load)
    // SMDB-1 feeds DB-1 and DB-2 (and has 5 kVA direct load)
    // DB-1 has 20 kVA direct load
    // DB-2 has 30 kVA direct load
    //
    // Expected:
    // DB-1: direct=20, inherited=0, total=20
    // DB-2: direct=30, inherited=0, total=30
    // SMDB-1: direct=5, inherited=50, total=55
    // MDB: direct=10, inherited=55, total=65
    const panels: PanelNode[] = [
      { id: 'mdb', name: 'MDB', fedFromId: null, directDemandKva: 10 },
      { id: 'smdb1', name: 'SMDB-1', fedFromId: 'mdb', directDemandKva: 5 },
      { id: 'db1', name: 'DB-1', fedFromId: 'smdb1', directDemandKva: 20 },
      { id: 'db2', name: 'DB-2', fedFromId: 'smdb1', directDemandKva: 30 }
    ];

    const res = analyzeDistributionHierarchy(panels);

    expect(res.hasCycle).toBe(false);
    expect(res.loadMap['db1'].totalDemandKva).toBe(20);
    expect(res.loadMap['db2'].totalDemandKva).toBe(30);
    expect(res.loadMap['smdb1'].inheritedDemandKva).toBe(50);
    expect(res.loadMap['smdb1'].totalDemandKva).toBe(55);
    expect(res.loadMap['mdb'].inheritedDemandKva).toBe(55);
    expect(res.loadMap['mdb'].totalDemandKva).toBe(65);
  });

  it('detects circular loop feeds and identifies offending path', () => {
    // P1 -> P2 -> P3 -> P1
    const panels: PanelNode[] = [
      { id: 'p1', name: 'Panel-1', fedFromId: 'p3', directDemandKva: 10 },
      { id: 'p2', name: 'Panel-2', fedFromId: 'p1', directDemandKva: 10 },
      { id: 'p3', name: 'Panel-3', fedFromId: 'p2', directDemandKva: 10 }
    ];

    const res = analyzeDistributionHierarchy(panels);

    expect(res.hasCycle).toBe(true);
    expect(res.cyclePathStr).toContain('Panel-');
  });
});
