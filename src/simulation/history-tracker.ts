export interface EpochSnapshot {
  epoch: number;
  era: string;
  worldState: {
    era: string;
    epoch: number;
    resources: Record<string, number>;
    discoveries: Array<{ title: string; description: string; epochDiscovered: number }>;
    enabledDomains: string[];
    populationNote: string | null;
  };
  agents: Array<{
    id: string;
    name: string;
    archetype: string;
    expertise: string[];
    status: string;
    memoryCount: number;
    relationships: Record<string, number>;
  }>;
  activeHypotheses: Array<{
    id: string;
    title: string;
    proposerId: string;
    status: string;
    difficulty: string;
  }>;
  activeTeams: Array<{
    id: string;
    hypothesisTitle: string;
    memberIds: string[];
    turnCount: number;
    outcome: string | null;
  }>;
  events: string[];
  metadata: {
    timestamp: number;
    populationEstimate: number;
    currentEra: string;
    totalDiscoveries: number;
  };
}

export class HistoryTracker {
  private snapshots: EpochSnapshot[] = [];

  recordSnapshot(data: Omit<EpochSnapshot, 'metadata'>): void {
    const snapshot: EpochSnapshot = {
      ...data,
      metadata: {
        timestamp: Date.now(),
        populationEstimate: data.agents.length,
        currentEra: data.era,
        totalDiscoveries: data.worldState.discoveries.length,
      },
    };
    this.snapshots.push(snapshot);
  }

  getSnapshot(epoch: number): EpochSnapshot | undefined {
    return this.snapshots.find(s => s.epoch === epoch);
  }

  getAllSnapshots(): EpochSnapshot[] {
    return [...this.snapshots];
  }

  getLatestSnapshot(): EpochSnapshot | undefined {
    return this.snapshots.length > 0
      ? this.snapshots[this.snapshots.length - 1]
      : undefined;
  }

  getResourceHistory(): Array<{ epoch: number; resources: Record<string, number> }> {
    return this.snapshots.map(s => ({
      epoch: s.epoch,
      resources: { ...s.worldState.resources },
    }));
  }

  getDiscoveryTimeline(): Array<{ epoch: number; title: string; domain: string }> {
    const seen = new Set<string>();
    const entries: Array<{ epoch: number; title: string; domain: string }> = [];
    for (const snap of this.snapshots) {
      for (const d of snap.worldState.discoveries) {
        const key = `${d.title}:${d.epochDiscovered}`;
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({ epoch: d.epochDiscovered, title: d.title, domain: '' });
        }
      }
    }
    return entries.sort((a, b) => a.epoch - b.epoch);
  }

  getEraTimeline(): Array<{ epoch: number; era: string }> {
    const seen = new Set<string>();
    return this.snapshots.filter(s => {
      const key = `${s.epoch}:${s.era}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(s => ({ epoch: s.epoch, era: s.era }));
  }

  clear(): void {
    this.snapshots = [];
  }
}
