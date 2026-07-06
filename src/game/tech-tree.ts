export interface TechNode {
  id: string;
  name: string;
  description: string;
  era: string;
  prerequisites: string[];
  unlockedBy?: string;
}

export const TECH_TREE: TechNode[] = [
  { id: 'fire', name: 'Fire Mastery', description: 'Control of fire for warmth and cooking', era: 'Stone Age', prerequisites: [] },
  { id: 'stone_tools', name: 'Stone Toolmaking', description: 'Basic knives, axes, and scrapers', era: 'Stone Age', prerequisites: ['fire'] },
  { id: 'shelter', name: 'Shelter Building', description: 'Huts and windbreaks', era: 'Stone Age', prerequisites: ['stone_tools'] },
  { id: 'foraging', name: 'Advanced Foraging', description: 'Efficient gathering of wild foods', era: 'Stone Age', prerequisites: ['fire'] },
  { id: 'hunting', name: 'Hunting', description: 'Spears and tracking techniques', era: 'Stone Age', prerequisites: ['stone_tools'] },
  { id: 'clothing', name: 'Hide Clothing', description: 'Warm clothing from animal hides', era: 'Stone Age', prerequisites: ['stone_tools'] },
  { id: 'pottery', name: 'Pottery', description: 'Clay vessels for storage', era: 'Stone Age', prerequisites: ['fire', 'foraging'] },
  { id: 'weaving', name: 'Weaving', description: 'Baskets and basic fabrics', era: 'Stone Age', prerequisites: ['foraging'] },
  { id: 'medicine', name: 'Herbal Medicine', description: 'Healing with plants', era: 'Stone Age', prerequisites: ['foraging'] },
  { id: 'navigation', name: 'Navigation', description: 'Reading stars and landmarks', era: 'Stone Age', prerequisites: ['hunting'] },
  { id: 'farming', name: 'Agriculture', description: 'Planting and harvesting crops', era: 'Copper Age', prerequisites: ['pottery', 'foraging'] },
  { id: 'domestication', name: 'Animal Domestication', description: 'Taming animals for work and food', era: 'Copper Age', prerequisites: ['hunting', 'farming'] },
  { id: 'copper_smelting', name: 'Copper Smelting', description: 'Extracting copper from ore', era: 'Copper Age', prerequisites: ['fire', 'stone_tools'] },
  { id: 'copper_tools', name: 'Copper Tools', description: 'Stronger copper implements', era: 'Copper Age', prerequisites: ['copper_smelting'] },
  { id: 'tin_smelting', name: 'Tin Smelting', description: 'Extracting tin from ore', era: 'Copper Age', prerequisites: ['fire', 'stone_tools'] },
  { id: 'wheel', name: 'The Wheel', description: 'Rolling transportation', era: 'Copper Age', prerequisites: ['copper_tools'] },
  { id: 'irrigation', name: 'Irrigation', description: 'Water channels for fields', era: 'Copper Age', prerequisites: ['farming', 'pottery'] },
  { id: 'trade', name: 'Trade', description: 'Exchange of goods between settlements', era: 'Copper Age', prerequisites: ['weaving', 'pottery'] },
  { id: 'bronze_smelting', name: 'Bronze Smelting', description: 'Alloying copper and tin', era: 'Bronze Age', prerequisites: ['copper_smelting', 'tin_smelting', 'trade'] },
  { id: 'bronze_weapons', name: 'Bronze Weapons', description: 'Swords, spears, and armor', era: 'Bronze Age', prerequisites: ['bronze_smelting'] },
  { id: 'writing', name: 'Writing', description: 'Recording language in symbols', era: 'Bronze Age', prerequisites: ['trade', 'pottery'] },
  { id: 'wheeled_cart', name: 'Wheeled Cart', description: 'Goods transported by ox-cart', era: 'Bronze Age', prerequisites: ['wheel', 'domestication'] },
  { id: 'sailing', name: 'Sailing', description: 'Wind-powered water travel', era: 'Bronze Age', prerequisites: ['navigation', 'bronze_smelting'] },
  { id: 'iron_smelting', name: 'Iron Smelting', description: 'Working iron ore', era: 'Iron Age', prerequisites: ['bronze_smelting', 'writing'] },
  { id: 'iron_tools', name: 'Iron Tools', description: 'Superior iron implements', era: 'Iron Age', prerequisites: ['iron_smelting'] },
  { id: 'iron_weapons', name: 'Iron Weapons', description: 'Swords and armor of iron', era: 'Iron Age', prerequisites: ['iron_smelting', 'bronze_weapons'] },
  { id: 'government', name: 'Government', description: 'Structured leadership and laws', era: 'Iron Age', prerequisites: ['writing', 'trade'] },
  { id: 'currency', name: 'Currency', description: 'Standardized medium of exchange', era: 'Iron Age', prerequisites: ['government', 'trade'] },
  { id: 'philosophy', name: 'Philosophy', description: 'Systematic inquiry into existence', era: 'Iron Age', prerequisites: ['writing'] },
];

export function getTechNode(id: string): TechNode | undefined {
  return TECH_TREE.find(t => t.id === id);
}

export function getDiscoveredTechs(discoveryTitles: string[]): TechNode[] {
  return TECH_TREE.filter(t => discoveryTitles.some(d => t.name.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(t.name.toLowerCase())));
}

export function getUnlockableTechs(discoveryTitles: string[], era: string): TechNode[] {
  const knownIds = new Set(getDiscoveredTechs(discoveryTitles).map(t => t.id));
  return TECH_TREE.filter(t => {
    if (knownIds.has(t.id)) return false;
    if (techTreeEraRank(t.era) > techTreeEraRank(era) + 1) return false;
    return t.prerequisites.every(p => knownIds.has(p));
  });
}

function techTreeEraRank(era: string): number {
  const ranks: Record<string, number> = { 'Stone Age': 0, 'Copper Age': 1, 'Bronze Age': 2, 'Iron Age': 3 };
  return ranks[era] ?? 0;
}

export function renderTechTreeAscii(discoveryTitles: string[], width: number = 50): string {
  const discovered = getDiscoveredTechs(discoveryTitles);
  const knownIds = new Set(discovered.map(t => t.id));
  const R = '\x1b[0m', GRN = '\x1b[32m', GY = '\x1b[90m', YEL = '\x1b[33m', CYN = '\x1b[36m';

  const lines: string[] = [];
  lines.push(`  ${CYN}Technology Tree${R} ${GY}(green = discovered, yellow = available)${R}`);

  for (const era of ['Stone Age', 'Copper Age', 'Bronze Age', 'Iron Age']) {
    const eraTechs = TECH_TREE.filter(t => t.era === era);
    if (eraTechs.length === 0) continue;
    const discoveredInEra = eraTechs.filter(t => knownIds.has(t.id));
    if (discoveredInEra.length === 0) continue;

    lines.push(`  ${YEL}${era}${R} ${GY}(${discoveredInEra.length}/${eraTechs.length})${R}`);

    for (const t of eraTechs) {
      if (!knownIds.has(t.id)) continue;
      const prereqs = t.prerequisites.filter(p => knownIds.has(p)).join(', ') || 'none';
      lines.push(`    ${GRN}◆${R} ${t.name} ${GY}[${prereqs}]${R}`);
    }
  }

  return lines.join('\n');
}
