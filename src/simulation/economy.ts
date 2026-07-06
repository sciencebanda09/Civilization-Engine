import type { WorldState } from '../types/index.js';

export interface EconomyConfig {
  baseConsumption: Record<string, number>;
  baseProduction: Record<string, number>;
  discoveryBonuses: Record<string, Record<string, number>>;
  starvationThreshold: number;
}

export interface EconomyResult {
  deltas: Record<string, number>;
  consumption: Record<string, number>;
  production: Record<string, number>;
  starvation: boolean;
  surplus: boolean;
  descriptions: string[];
  populationChange: number;
}

export const DEFAULT_ECONOMY: EconomyConfig = {
  baseConsumption: { food: 1 },
  baseProduction: { food: 48, wood: 12, stone: 5 },
  discoveryBonuses: {
    'basic_toolmaking': { food: 5, wood: 5 },
    'foraging': { food: 10 },
    'farming': { food: 30 },
    'mining': { stone: 15 },
    'irrigation': { food: 20 },
    'animal_husbandry': { food: 25 },
  },
  starvationThreshold: 3,
};

export class EconomyEngine {
  private config: EconomyConfig;
  private rng: () => number;

  constructor(config: EconomyConfig, rng?: () => number) {
    this.config = config;
    this.rng = rng ?? Math.random;
  }

  processEpoch(worldState: WorldState, activeAgentCount: number, discoveries: string[]): EconomyResult {
    const consumption: Record<string, number> = {};
    const production: Record<string, number> = {};
    const descriptions: string[] = [];

    const allResources = new Set<string>();
    for (const key of Object.keys(this.config.baseProduction)) allResources.add(key);
    for (const key of Object.keys(this.config.baseConsumption)) allResources.add(key);
    for (const bonus of Object.values(this.config.discoveryBonuses)) {
      for (const key of Object.keys(bonus)) allResources.add(key);
    }

    for (const [resource, amount] of Object.entries(this.config.baseProduction)) {
      const variance = 0.8 + this.rng() * 0.4;
      production[resource] = (production[resource] ?? 0) + amount * variance;
    }

    for (const [resource, amount] of Object.entries(this.config.baseConsumption)) {
      const variance = 0.8 + this.rng() * 0.4;
      consumption[resource] = (consumption[resource] ?? 0) + amount * activeAgentCount * variance;
    }

    for (const discovery of discoveries) {
      const bonuses = this.config.discoveryBonuses[discovery];
      if (bonuses) {
        for (const [resource, amount] of Object.entries(bonuses)) {
          allResources.add(resource);
          const variance = 0.8 + this.rng() * 0.4;
          production[resource] = (production[resource] ?? 0) + amount * variance;
        }
        descriptions.push(`Discovery '${discovery}' boosted resource production.`);
      }
    }

    const deltas: Record<string, number> = {};
    for (const resource of allResources) {
      const prod = production[resource] ?? 0;
      const cons = consumption[resource] ?? 0;
      deltas[resource] = prod - cons;
    }

    for (const resource of allResources) {
      const current = worldState.resources[resource] ?? 0;
      worldState.resources[resource] = Math.max(0, current + deltas[resource]);
    }

    const foodConsumed = consumption['food'] ?? 0;
    const currentFood = worldState.resources['food'] ?? 0;

    const starvation = currentFood < this.config.starvationThreshold * activeAgentCount;
    const surplus = !starvation && currentFood > 3 * foodConsumed;

    let populationChange = 0;
    if (starvation) {
      populationChange = -1;
      descriptions.push('Food scarcity caused population decline.');
    } else if (surplus) {
      populationChange = 1;
      descriptions.push('Food surplus led to population growth.');
    }

    return {
      deltas,
      consumption,
      production,
      starvation,
      surplus,
      descriptions,
      populationChange,
    };
  }
}
