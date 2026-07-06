export interface EraDefinition {
  id: string;
  name: string;
  minEpoch: number;
  requiredDiscoveries: string[];
  enabledDomains: string[];
  resourceBonuses: Record<string, number>;
  description: string;
}

export const DEFAULT_ERAS: EraDefinition[] = [
  {
    id: 'stone_age',
    name: 'Stone Age',
    minEpoch: 1,
    requiredDiscoveries: [],
    enabledDomains: ['basic_toolmaking', 'foraging', 'shelter_building'],
    resourceBonuses: { food: 1, stone: 1 },
    description: "The dawn of civilization. Simple tools and the mastery of fire mark humanity's first steps.",
  },
  {
    id: 'copper_age',
    name: 'Copper Age',
    minEpoch: 5,
    requiredDiscoveries: ['mining', 'smelting'],
    enabledDomains: ['metallurgy', 'trade'],
    resourceBonuses: { copper: 1, gold: 1 },
    description: 'Humanity learns to extract and shape metal, opening new avenues for tools and trade.',
  },
  {
    id: 'bronze_age',
    name: 'Bronze Age',
    minEpoch: 10,
    requiredDiscoveries: ['bronze_smelting'],
    enabledDomains: ['advanced_metallurgy', 'warfare'],
    resourceBonuses: { bronze: 2, production: 1 },
    description: 'The alloying of tin and copper yields stronger tools and weapons, reshaping society.',
  },
  {
    id: 'iron_age',
    name: 'Iron Age',
    minEpoch: 20,
    requiredDiscoveries: ['iron_smelting'],
    enabledDomains: ['advanced_warfare', 'construction'],
    resourceBonuses: { iron: 2, production: 2 },
    description: 'Iron, stronger and more abundant than bronze, becomes the backbone of industry and war.',
  },
  {
    id: 'classical_age',
    name: 'Classical Age',
    minEpoch: 30,
    requiredDiscoveries: ['writing', 'philosophy'],
    enabledDomains: ['government', 'science', 'art'],
    resourceBonuses: { culture: 3, gold: 2, science: 1 },
    description: 'Empires rise on the foundations of law, reason, and recorded knowledge.',
  },
  {
    id: 'medieval_age',
    name: 'Medieval Age',
    minEpoch: 50,
    requiredDiscoveries: ['feudalism', 'agriculture'],
    enabledDomains: ['chivalry', 'commerce'],
    resourceBonuses: { food: 3, gold: 2, faith: 1 },
    description: 'A structured world of lords and vassals, where faith and fealty shape the land.',
  },
  {
    id: 'renaissance',
    name: 'Renaissance',
    minEpoch: 70,
    requiredDiscoveries: ['printing', 'navigation'],
    enabledDomains: ['exploration', 'banking'],
    resourceBonuses: { science: 3, gold: 3, culture: 2 },
    description: 'A rebirth of knowledge and exploration, fueled by the printing press and daring voyages.',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    minEpoch: 90,
    requiredDiscoveries: ['steam_power', 'engineering'],
    enabledDomains: ['industry', 'transport'],
    resourceBonuses: { production: 5, coal: 2, science: 2 },
    description: 'Steam and steel transform the world, ushering in an age of machines and mass production.',
  },
];

export class EraManager {
  private eras: EraDefinition[];

  constructor(eras?: EraDefinition[]) {
    this.eras = eras ?? DEFAULT_ERAS;
  }

  getCurrentEra(epoch: number, discoveredDomains: string[]): EraDefinition {
    let current = this.eras[0];
    for (const era of this.eras) {
      if (epoch >= era.minEpoch && era.requiredDiscoveries.every(d => discoveredDomains.includes(d))) {
        current = era;
      }
    }
    return current;
  }

  getEraName(epoch: number, discoveredDomains: string[]): string {
    return this.getCurrentEra(epoch, discoveredDomains).name;
  }

  checkTransition(epoch: number, discoveredDomains: string[]): { from: EraDefinition | null; to: EraDefinition | null; triggered: boolean } {
    const to = this.getCurrentEra(epoch, discoveredDomains);
    if (epoch <= 1) {
      return { from: null, to, triggered: true };
    }
    const from = this.getCurrentEra(epoch - 1, discoveredDomains);
    return {
      from: from.id === to.id ? null : from,
      to,
      triggered: from.id !== to.id,
    };
  }

  getEnabledDomains(epoch: number, discoveredDomains: string[]): string[] {
    const domains: string[] = [];
    for (const era of this.eras) {
      if (epoch >= era.minEpoch && era.requiredDiscoveries.every(d => discoveredDomains.includes(d))) {
        domains.push(...era.enabledDomains);
      }
    }
    return domains;
  }

  getResourceBonuses(epoch: number, discoveredDomains: string[]): Record<string, number> {
    const bonuses: Record<string, number> = {};
    for (const era of this.eras) {
      if (epoch >= era.minEpoch && era.requiredDiscoveries.every(d => discoveredDomains.includes(d))) {
        for (const [key, value] of Object.entries(era.resourceBonuses)) {
          bonuses[key] = (bonuses[key] ?? 0) + value;
        }
      }
    }
    return bonuses;
  }

  getAllEras(): EraDefinition[] {
    return [...this.eras];
  }
}
