import type { WorldState } from '../types/index.js';
import type { WorldMap } from '../map/terrain.js';
import { getResourcesOnTile, gatherResource } from '../map/terrain.js';

export interface SupplyChain {
  input: string[];
  output: string;
  rate: number;
  toolRequired: string[];
  buildingRequired: string;
}

export interface EconomyConfig {
  chains: SupplyChain[];
  baseConsumption: Record<string, number>;
  buildingMaintenance: Record<string, Record<string, number>>;
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
  crimeRate: number;
  revoltRisk: number;
}

export const DEFAULT_ECONOMY: EconomyConfig = {
  chains: [
    { input: [], output: 'food', rate: 40, toolRequired: [], buildingRequired: 'farm' },
    { input: ['wood'], output: 'food', rate: 10, toolRequired: [], buildingRequired: '' },
    { input: [], output: 'wood', rate: 15, toolRequired: ['axe'], buildingRequired: '' },
    { input: ['stone'], output: 'wood', rate: 5, toolRequired: [], buildingRequired: '' },
    { input: [], output: 'stone', rate: 8, toolRequired: ['pickaxe'], buildingRequired: 'mine' },
    { input: ['iron', 'coal'], output: 'iron_tools', rate: 3, toolRequired: [], buildingRequired: 'forge' },
    { input: ['iron'], output: 'weapons', rate: 2, toolRequired: ['hammer'], buildingRequired: 'forge' },
    { input: ['clay'], output: 'pottery', rate: 5, toolRequired: [], buildingRequired: 'kiln' },
  ],
  baseConsumption: { food: 1 },
  buildingMaintenance: {
    mine: { stone: 1 },
    forge: { iron: 0.5 },
    kiln: { wood: 2 },
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

  processEpoch(
    worldState: WorldState,
    activeAgentCount: number,
    discoveries: string[],
    map?: WorldMap,
    buildings?: string[],
  ): EconomyResult {
    const consumption: Record<string, number> = {};
    const production: Record<string, number> = {};
    const descriptions: string[] = [];
    const buildingList = buildings ?? [];

    const hasTool = (tool: string) => discoveries.some(d => d.toLowerCase().includes(tool.toLowerCase()));
    const hasBuilding = (b: string) => buildingList.some(b2 => b2.toLowerCase() === b.toLowerCase());

    // Phase 1: Basic production from chains
    for (const chain of this.config.chains) {
      // Check tool requirements
      const toolsMet = chain.toolRequired.length === 0 || chain.toolRequired.every(t => hasTool(t));
      if (!toolsMet) continue;

      // Check building requirements
      if (chain.buildingRequired && !hasBuilding(chain.buildingRequired)) continue;

      // Check input availability
      let canProduce = true;
      for (const input of chain.input) {
        const available = worldState.resources[input] ?? 0;
        const needed = chain.rate * 0.5;
        if (available < needed) {
          canProduce = false;
          break;
        }
      }

      if (!canProduce) {
        // Partial production due to scarcity
        const scarcityFactor = chain.input.reduce((min, input) => {
          const available = worldState.resources[input] ?? 0;
          const needed = chain.rate * 0.5;
          return Math.min(min, needed > 0 ? available / needed : 1);
        }, 1);

        const partial = chain.rate * scarcityFactor * 0.5 * (0.8 + this.rng() * 0.4);
        production[chain.output] = (production[chain.output] ?? 0) + partial;
        continue;
      }

      // Consume inputs
      for (const input of chain.input) {
        const consumed = chain.rate * 0.5 * (0.8 + this.rng() * 0.4);
        const current = worldState.resources[input] ?? 0;
        const actual = Math.min(consumed, current);
        worldState.resources[input] = current - actual;
        consumption[input] = (consumption[input] ?? 0) + actual;
      }

      // Produce output
      const produced = chain.rate * (0.8 + this.rng() * 0.4);
      production[chain.output] = (production[chain.output] ?? 0) + produced;
    }

    // Phase 2: Discovery bonuses
    for (const discovery of discoveries) {
      if (discovery.includes('irrigation')) production['food'] = (production['food'] ?? 0) + 20;
      if (discovery.includes('animal_husbandry') || discovery.includes('domestication')) production['food'] = (production['food'] ?? 0) + 15;
      if (discovery.includes('mining')) production['stone'] = (production['stone'] ?? 0) + 10;
    }

    // Phase 3: Building maintenance costs
    for (const [building, costs] of Object.entries(this.config.buildingMaintenance)) {
      if (!hasBuilding(building)) continue;
      for (const [resource, amount] of Object.entries(costs)) {
        const current = worldState.resources[resource] ?? 0;
        const cost = amount * (0.5 + this.rng() * 0.5);
        const paid = Math.min(cost, current);
        worldState.resources[resource] = current - paid;
        consumption[resource] = (consumption[resource] ?? 0) + paid;
        if (paid < cost * 0.5) {
          descriptions.push(`${building} is decaying due to ${resource} shortage.`);
        }
      }
    }

    // Phase 4: Population consumption
    const foodPerPerson = this.config.baseConsumption['food'] ?? 1;
    const totalFoodNeed = foodPerPerson * activeAgentCount * (0.8 + this.rng() * 0.4);
    const currentFood = worldState.resources['food'] ?? 0;
    const foodConsumed = Math.min(totalFoodNeed, currentFood);
    worldState.resources['food'] = currentFood - foodConsumed;
    consumption['food'] = (consumption['food'] ?? 0) + foodConsumed;

    // Phase 5: Gather resources from map tiles
    if (map) {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const tile = getResourcesOnTile(map, x, y);
          if (tile && tile.amount > 0) {
            const gathered = gatherResource(map, x, y, 1);
            if (gathered > 0) {
              worldState.resources[tile.resource] = (worldState.resources[tile.resource] ?? 0) + gathered * 0.1;
            }
          }
        }
      }
    }

    // Calculate deltas
    const deltas: Record<string, number> = {};
    for (const resource of new Set([...Object.keys(consumption), ...Object.keys(production)])) {
      const prod = production[resource] ?? 0;
      const cons = consumption[resource] ?? 0;
      deltas[resource] = prod - cons;
    }

    // Starvation, surplus, population
    const foodShortage = totalFoodNeed - foodConsumed;
    const starvation = foodShortage > totalFoodNeed * 0.3;
    const surplus = !starvation && currentFood > totalFoodNeed * 2;

    let populationChange = 0;
    if (starvation) {
      populationChange = -Math.max(1, Math.floor(foodShortage / foodPerPerson));
      descriptions.push(`Starvation! ${Math.abs(populationChange)} people lost.`);
    } else if (surplus) {
      populationChange = Math.floor(1 + this.rng() * 2);
    }

    // Crime and revolt emerge from conditions
    const foodRatio = currentFood / Math.max(1, totalFoodNeed);
    const crimeRate = Math.max(0, Math.min(100, (1 - foodRatio) * 50 + (activeAgentCount > 100 ? 10 : 0)));
    const revoltRisk = crimeRate > 60 ? (crimeRate - 60) * 0.5 : 0;

    return {
      deltas,
      consumption,
      production,
      starvation,
      surplus,
      descriptions,
      populationChange,
      crimeRate,
      revoltRisk,
    };
  }
}
