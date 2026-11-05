export interface PanelNode {
  id: string;
  name: string;
  fedFromId?: string | null;
  directDemandKva: number;
}

export interface HierarchyAnalysisResult {
  hasCycle: boolean;
  cycleNodes: string[];
  cyclePathStr: string;
  loadMap: Record<string, {
    directDemandKva: number;
    inheritedDemandKva: number;
    totalDemandKva: number;
    depth: number;
    childrenIds: string[];
  }>;
}

/**
 * Detects cycles in panel feed relations and rolls up loads from downstream panels to upstream incomers.
 */
export function analyzeDistributionHierarchy(panels: PanelNode[]): HierarchyAnalysisResult {
  const nodeMap = new Map<string, PanelNode>();
  panels.forEach(p => nodeMap.set(p.id, p));

  // Build parent -> children map and child -> parent map
  const childrenMap = new Map<string, string[]>();
  panels.forEach(p => {
    childrenMap.set(p.id, []);
  });

  panels.forEach(p => {
    if (p.fedFromId && nodeMap.has(p.fedFromId)) {
      childrenMap.get(p.fedFromId)?.push(p.id);
    }
  });

  // 1. Cycle Detection using DFS
  const visited = new Set<string>();
  const recStack = new Set<string>();
  let hasCycle = false;
  let cycleNodes: string[] = [];
  let cyclePathStr = '';

  function dfsDetectCycle(nodeId: string, path: string[]): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const parentId = nodeMap.get(nodeId)?.fedFromId;
    if (parentId && nodeMap.has(parentId)) {
      if (!visited.has(parentId)) {
        if (dfsDetectCycle(parentId, path)) return true;
      } else if (recStack.has(parentId)) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(parentId);
        cycleNodes = path.slice(cycleStartIndex);
        cycleNodes.push(parentId);
        const namePath = cycleNodes.map(id => nodeMap.get(id)?.name || id);
        cyclePathStr = namePath.join(' → ');
        hasCycle = true;
        return true;
      }
    }

    path.pop();
    recStack.delete(nodeId);
    return false;
  }

  for (const p of panels) {
    if (!visited.has(p.id)) {
      if (dfsDetectCycle(p.id, [])) break;
    }
  }

  // 2. Load Propagation (if no cycle)
  const loadMap: Record<string, {
    directDemandKva: number;
    inheritedDemandKva: number;
    totalDemandKva: number;
    depth: number;
    childrenIds: string[];
  }> = {};

  panels.forEach(p => {
    loadMap[p.id] = {
      directDemandKva: p.directDemandKva,
      inheritedDemandKva: 0,
      totalDemandKva: p.directDemandKva,
      depth: 0,
      childrenIds: childrenMap.get(p.id) || []
    };
  });

  if (!hasCycle) {
    // Memoized rollup function
    const memo = new Map<string, number>();

    function computeSubtreeLoad(id: string, currentDepth: number): number {
      if (memo.has(id)) return memo.get(id)!;

      loadMap[id].depth = Math.max(loadMap[id].depth, currentDepth);

      let childrenTotal = 0;
      const childIds = childrenMap.get(id) || [];
      for (const childId of childIds) {
        childrenTotal += computeSubtreeLoad(childId, currentDepth + 1);
      }

      loadMap[id].inheritedDemandKva = Number(childrenTotal.toFixed(2));
      loadMap[id].totalDemandKva = Number((loadMap[id].directDemandKva + childrenTotal).toFixed(2));

      memo.set(id, loadMap[id].totalDemandKva);
      return loadMap[id].totalDemandKva;
    }

    panels.forEach(p => {
      computeSubtreeLoad(p.id, 0);
    });
  }

  return {
    hasCycle,
    cycleNodes,
    cyclePathStr,
    loadMap
  };
}
