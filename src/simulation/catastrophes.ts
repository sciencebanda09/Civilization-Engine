import type { WorldState } from '../types/index.js';

export type CatastropheType =
  | 'drought'
  | 'plague'
  | 'flood'
  | 'earthquake'
  | 'wildfire'
  | 'raid'
  | 'blizzard'
  | 'locust'
  | 'famine';

export interface CatastropheConfig {
  baseProbability: number;
  cooldownEpochs: number;
  severityRange: [number, number];
  enabledTypes: CatastropheType[];
}

export interface CatastropheEvent {
  type: CatastropheType;
  severity: number;
  description: string;
  resourceDeltas: Record<string, number>;
  agentAffected: boolean;
  populationLoss: number;
  discoveryBlocked: string | null;
  duration: number;
}

type DescriptionMap = {
  [K in CatastropheType]: string[];
};

const NARRATIVE_DESCRIPTIONS: DescriptionMap = {
  drought: [
    'A terrible drought withers the crops. Streams run dry and the earth cracks under the relentless sun.',
    'The rains have failed for the third season. Reservoirs dwindle to mud, and farmers stare at barren fields.',
    'A prolonged dry spell parches the land. Dust storms sweep through the settlement, choking the livestock.',
  ],
  plague: [
    'A mysterious sickness spreads through the settlement, claiming the weak and the strong alike.',
    'Buboes and fever grip the populace. The healers are overwhelmed as the contagion jumps from hut to hut.',
    'A wasting disease creeps through the crowded quarters. coughing echoes in every street.',
  ],
  flood: [
    'The river bursts its banks, swallowing homes and washing away stores of grain.',
    'Torrential rains turn the streets into raging channels. The low-lying districts are submerged.',
  ],
  earthquake: [
    'The ground lurches violently. Buildings sway, collapse, and dust fills the air with choking grit.',
    'A deep rumble swells from beneath, then the world shakes. Cracks split the earth and walls tumble.',
  ],
  wildfire: [
    'A wall of flame races across the dry brush, driven by howling winds toward the settlement.',
    'Lightning ignites the tinder-dry forest. Within hours an inferno surrounds the outskirts.',
  ],
  raid: [
    'War parties descend from the hills, torches blazing. They strike the granaries and livestock pens.',
    'Horsemen appear on the horizon at dawn. By midday the storehouses are plundered and smoke rises.',
  ],
  blizzard: [
    'A howling blizzard buries the settlement in snow. Winds tear at roofs and frost claims the unprepared.',
    'The sky turns white as a ferocious winter storm descends, cutting off all paths and freezing the supplies.',
  ],
  locust: [
    'A dark cloud descends upon the fields — locusts, millions of them, stripping every stalk bare.',
    'The buzzing swarm blots out the sun. When it passes, not a single green leaf remains.',
  ],
  famine: [
    'Empty granaries and hollow cheeks. The stored food has run out, and hunger grips the land.',
    'A slow famine tightens its grip. Rations are cut, then halved again. Desperation grows.',
  ],
};

export const DEFAULT_CATASTROPHE_CONFIG: CatastropheConfig = {
  baseProbability: 0.12,
  cooldownEpochs: 3,
  severityRange: [0.2, 0.8],
  enabledTypes: ['drought', 'plague', 'flood', 'wildfire', 'blizzard'],
};

const BASE_RESOURCE_DELTAS: Record<CatastropheType, Record<string, number>> = {
  drought: { food: -40, water: -50 },
  plague: { health: -30, population: -15 },
  flood: { food: -30, shelter: -40, health: -10 },
  earthquake: { shelter: -50, health: -15 },
  wildfire: { shelter: -35, food: -20, health: -5 },
  raid: { food: -45, gold: -30, safety: -20 },
  blizzard: { food: -25, health: -15, fuel: -40 },
  locust: { food: -60 },
  famine: { food: -50, health: -20 },
};

const BASE_POPULATION_LOSS: Record<CatastropheType, number> = {
  drought: 1,
  plague: 4,
  flood: 2,
  earthquake: 3,
  wildfire: 2,
  raid: 2,
  blizzard: 1,
  locust: 0,
  famine: 3,
};

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickDescription(type: CatastropheType, rng: () => number): string {
  const options = NARRATIVE_DESCRIPTIONS[type];
  return pickRandom(options, rng);
}

export class CatastropheEngine {
  private config: CatastropheConfig;
  private rng: () => number;
  private lastCatastropheEpoch: number = -Infinity;
  private activeEvents: CatastropheEvent[] = [];

  constructor(config: CatastropheConfig, rng?: () => number) {
    this.config = { ...config };
    this.rng = rng ?? Math.random;
  }

  checkForEvent(
    epoch: number,
    worldState: WorldState,
    activeDiscoveries: string[],
  ): CatastropheEvent | null {
    if (epoch - this.lastCatastropheEpoch < this.config.cooldownEpochs) {
      return null;
    }

    if (this.rng() > this.config.baseProbability) {
      return null;
    }

    const availableTypes = this.config.enabledTypes.filter(
      (t) => !this.activeEvents.some((e) => e.type === t),
    );
    if (availableTypes.length === 0) {
      return null;
    }

    const type = pickRandom(availableTypes, this.rng);

    const [minSeverity, maxSeverity] = this.config.severityRange;
    let severity = minSeverity + this.rng() * (maxSeverity - minSeverity);
    severity = this.scaleSeverity(type, severity, worldState);

    const resourceDeltas = this.computeResourceDeltas(type, severity);
    const populationLoss = Math.round(BASE_POPULATION_LOSS[type] * severity);
    const agentAffected = populationLoss > 0;

    const duration = this.rollDuration(type, severity);

    const blocked = this.maybeBlockDiscovery(activeDiscoveries);

    const description = pickDescription(type, this.rng);

    const event: CatastropheEvent = {
      type,
      severity,
      description,
      resourceDeltas,
      agentAffected,
      populationLoss,
      discoveryBlocked: blocked,
      duration,
    };

    this.lastCatastropheEpoch = epoch;
    this.activeEvents.push(event);

    return event;
  }

  getActiveEffects(): CatastropheEvent[] {
    return this.activeEvents;
  }

  tickEffects(): void {
    const remaining: CatastropheEvent[] = [];
    for (const event of this.activeEvents) {
      event.duration -= 1;
      if (event.duration > 0) {
        remaining.push(event);
      }
    }
    this.activeEvents = remaining;
  }

  getDescription(event: CatastropheEvent): string {
    const desc = event.description;
    const severityLabel =
      event.severity < 0.33
        ? 'mild'
        : event.severity < 0.66
          ? 'severe'
          : 'catastrophic';
    const popPart =
      event.populationLoss > 0
        ? ` ${event.populationLoss} souls lost.`
        : '';
    const durationPart =
      event.duration > 1 ? ` (lasts ${event.duration} more epochs)` : '';
    const blockedPart = event.discoveryBlocked
      ? ` Progress on "${event.discoveryBlocked}" is set back.`
      : '';
    return `[${severityLabel}] ${desc}${popPart}${durationPart}${blockedPart}`;
  }

  private scaleSeverity(
    type: CatastropheType,
    baseSeverity: number,
    worldState: WorldState,
  ): number {
    const food = worldState.resources['food'] ?? 50;
    const health = worldState.resources['health'] ?? 50;
    const shelter = worldState.resources['shelter'] ?? 50;

    let multiplier = 1;

    switch (type) {
      case 'drought':
      case 'wildfire':
      case 'famine':
        if (food < 30) multiplier += 0.4;
        else if (food < 50) multiplier += 0.2;
        break;
      case 'plague':
        if (health < 30) multiplier += 0.5;
        else if (health < 50) multiplier += 0.25;
        if (food < 30) multiplier += 0.2;
        break;
      case 'blizzard':
        if (food < 30 || shelter < 30) multiplier += 0.4;
        break;
      case 'flood':
        if (shelter < 30) multiplier += 0.3;
        break;
      case 'earthquake':
        if (shelter < 30) multiplier += 0.3;
        break;
      case 'raid':
        if (food > 60) multiplier += 0.3;
        break;
      case 'locust':
        if (food > 50) multiplier += 0.5;
        break;
    }

    return Math.min(1, baseSeverity * multiplier);
  }

  private computeResourceDeltas(
    type: CatastropheType,
    severity: number,
  ): Record<string, number> {
    const base = BASE_RESOURCE_DELTAS[type];
    const deltas: Record<string, number> = {};
    for (const [key, value] of Object.entries(base)) {
      deltas[key] = -Math.round(Math.abs(value) * severity);
    }
    return deltas;
  }

  private rollDuration(type: CatastropheType, severity: number): number {
    if (severity < 0.4) return 1;
    if (type === 'drought' || type === 'plague' || type === 'famine') {
      return severity < 0.7 ? 2 : 3;
    }
    return 2;
  }

  private maybeBlockDiscovery(activeDiscoveries: string[]): string | null {
    if (activeDiscoveries.length === 0 || this.rng() > 0.3) {
      return null;
    }
    return pickRandom(activeDiscoveries, this.rng);
  }
}
