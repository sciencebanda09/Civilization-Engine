export interface WorldState {
  era: string;
  epoch: number;
  resources: Record<string, number>;
  flags: Record<string, string>;
  discoveries: StoredDiscovery[];
  populationNote: string | null;
  enabledDomains: string[];
}

export interface StoredDiscovery {
  id: string;
  title: string;
  description: string;
  epochDiscovered: number;
  discoveredBy: string[];
  enabledDomains: string[];
}

export interface WorldStateDelta {
  resourceOrFlag: string;
  change: string;
}
