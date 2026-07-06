import type { WorldState } from '../types/index.js';
import type { Faction } from '../factions/faction-manager.js';
import type { EnemyTribe } from '../world/enemy-tribes.js';
import { getUnlockableTechs } from './tech-tree.js';

export interface DecisionEffect {
  resources?: Partial<Record<string, number>>;
  defense?: number;
  popGrowth?: number;
  popLoss?: number;
  discoveryBoost?: number;
  enemyHostility?: number;
  factionInfluence?: { name: string; delta: number }[];
  risk?: number;
  narrative: string;
}

export interface CouncilChoice {
  id: string;
  icon: string;
  title: string;
  desc: string;
  effect: DecisionEffect;
  condition?: (world: WorldState, factions: Faction[], enemies: EnemyTribe[]) => boolean;
}

export interface CrisisChoice {
  id: string;
  icon: string;
  title: string;
  desc: string;
  risk: 'low' | 'medium' | 'high';
  effect: DecisionEffect;
}

export interface TechChoice {
  id: string;
  name: string;
  desc: string;
  era: string;
}

export function getCouncilChoices(
  world: WorldState,
  factions: Faction[],
  enemies: EnemyTribe[],
): CouncilChoice[] {
  const choices: CouncilChoice[] = [
    {
      id: 'gather_food',
      icon: '🌾',
      title: 'Gather Food',
      desc: 'Send foragers and hunters',
      effect: { resources: { food: 35, wood: -3, stone: -3 }, narrative: 'The hunters return with full packs. The granaries swell.' },
    },
    {
      id: 'fortify',
      icon: '🛡️',
      title: 'Fortify Defenses',
      desc: 'Build palisades and watchtowers',
      effect: { resources: { stone: -20, wood: -10 }, defense: 20, narrative: 'Workers raise wooden walls. The settlement feels safer.' },
    },
    {
      id: 'research',
      icon: '🔬',
      title: 'Sponsor Research',
      desc: 'Support your brightest minds',
      effect: { discoveryBoost: 2, resources: { food: -10 }, narrative: 'Scholars gather around the fire. Questions are asked.' },
    },
    {
      id: 'expand',
      icon: '🏘️',
      title: 'Expand Settlement',
      desc: 'Build new homes for the growing tribe',
      condition: (w) => (w as any).population > 50,
      effect: { popGrowth: 1.5, resources: { food: -15, wood: -12 }, narrative: 'New huts rise along the riverbank.' },
    },
    {
      id: 'trade',
      icon: '🤝',
      title: 'Trade Mission',
      desc: 'Send traders to neighboring peoples',
      effect: { resources: { food: 15, wood: 15, stone: 10 }, risk: 0.3, narrative: 'A caravan departs at dawn. Fortune favors the bold.' },
    },
  ];

  if (enemies.some(e => e.hostility > 35)) {
    choices.push({
      id: 'war_party',
      icon: '⚔️',
      title: 'War Party',
      desc: 'Strike before they strike us',
      effect: { enemyHostility: -25, resources: { food: -15, wood: -10 }, risk: 0.35, narrative: 'Warriors paint their faces and march into the unknown.' },
    });
  }

  if (enemies.some(e => e.hostility < 30 && e.relation !== 'friendly')) {
    choices.push({
      id: 'diplomacy',
      icon: '☮️',
      title: 'Send Envoys',
      desc: 'Offer peace to neutral tribes',
      effect: { enemyHostility: -15, resources: { food: -5 }, narrative: 'Envoys carry olive branches to the neighboring camp.' },
    });
  }

  return choices.filter(c => !c.condition || c.condition(world, factions, enemies));
}

export function getCrisisChoices(crisisType: string): CrisisChoice[] {
  const map: Record<string, CrisisChoice[]> = {
    flood: [
      { id: 'fish', icon: '🎣', title: 'Fish the River', desc: 'Brave the swollen waters for food', risk: 'high',
        effect: { resources: { food: 50 }, popLoss: 3, narrative: 'The river gives and takes. Many fish, some lives.' } },
      { id: 'forage', icon: '🍄', title: 'Forage the Woods', desc: 'Scour the flooded forest', risk: 'medium',
        effect: { resources: { food: 25, wood: 15 }, popLoss: 1, narrative: 'The forest yields mushrooms and driftwood.' } },
      { id: 'ration', icon: '📦', title: 'Ration Supplies', desc: 'Make do with what remains', risk: 'low',
        effect: { resources: { food: -5 }, narrative: 'Belt-tightening keeps everyone alive.' } },
    ],
    drought: [
      { id: 'dig_wells', icon: '⛏️', title: 'Dig Wells', desc: 'Dig deep for groundwater', risk: 'medium',
        effect: { resources: { stone: -15 }, popGrowth: 5, narrative: 'Water is found deep beneath the cracked earth.' } },
      { id: 'migrate', icon: '🚶', title: 'Follow the Herds', desc: 'Lead the tribe to greener lands', risk: 'high',
        effect: { resources: { food: 35 }, popLoss: 5, narrative: 'The journey is brutal but the new valley is lush.' } },
      { id: 'conserve', icon: '💧', title: 'Conserve Water', desc: 'Strict water rationing', risk: 'low',
        effect: { resources: { food: -8 }, narrative: 'Every drop is counted. The tribe endures.' } },
    ],
    plague: [
      { id: 'quarantine', icon: '🚷', title: 'Quarantine', desc: 'Isolate the sick', risk: 'low',
        effect: { popLoss: 2, narrative: 'The sick are cared for in isolation. Hard choices.' } },
      { id: 'herbs', icon: '🌿', title: 'Herbal Remedies', desc: 'Send healers to gather medicine', risk: 'medium',
        effect: { popLoss: 1, resources: { food: -10 }, narrative: 'Healers brew bitter teas. The fever breaks in some.' } },
      { id: 'prayer', icon: '🙏', title: 'Ritual Ceremony', desc: 'Ask the ancestors for mercy', risk: 'high',
        effect: { popLoss: 4, resources: { food: -20 }, narrative: 'The tribe chants all night. Dawn brings no answers.' } },
    ],
    raid: [
      { id: 'fight', icon: '⚔️', title: 'Stand and Fight', desc: 'Defend with all your strength', risk: 'high',
        effect: { popLoss: 5, enemyHostility: -25, resources: { food: 10 }, narrative: 'The battle is savage. The enemy retreats howling.' } },
      { id: 'bribe', icon: '💰', title: 'Pay Tribute', desc: 'Offer resources to buy peace', risk: 'low',
        effect: { resources: { food: -30, wood: -20 }, narrative: 'The enemy accepts the tribute and withdraws, for now.' } },
      { id: 'hide', icon: '🌲', title: 'Hide in the Woods', desc: 'Evacuate until they leave', risk: 'medium',
        effect: { popLoss: 2, resources: { food: -5 }, narrative: 'The tribe hides in silence as enemies ransack the empty huts.' } },
    ],
    earthquake: [
      { id: 'rebuild', icon: '🔨', title: 'Rebuild Stronger', desc: 'Use stronger methods', risk: 'medium',
        effect: { resources: { wood: -20, stone: -25 }, defense: 15, narrative: 'New buildings rise from rubble, stronger than before.' } },
      { id: 'relocate', icon: '🚚', title: 'Move the Settlement', desc: 'Find safer ground', risk: 'high',
        effect: { resources: { food: -30 }, popLoss: 3, narrative: 'The tribe packs what remains and moves east.' } },
      { id: 'repair', icon: '🛠️', title: 'Quick Repairs', desc: 'Patch what you can', risk: 'low',
        effect: { resources: { wood: -8, stone: -5 }, narrative: 'The village is patched with whatever materials remain.' } },
    ],
  };
  return map[crisisType] ?? [];
}

export function identifyCrisisType(desc: string): string | null {
  const l = desc.toLowerCase();
  if (/flood|rain|water|river|swollen/i.test(l)) return 'flood';
  if (/drought|dry|thirst|sun|heat|crops? wither/i.test(l)) return 'drought';
  if (/plague|sick|disease|illness|infection|fever/i.test(l)) return 'plague';
  if (/raid|attack|war|invade|enemy|hostile/i.test(l)) return 'raid';
  if (/earthquake|tremor|ground|tremble|quake|landslip/i.test(l)) return 'earthquake';
  return null;
}

export function getTechChoices(world: WorldState): TechChoice[] {
  const available = getUnlockableTechs(
    world.discoveries.map(d => d.title),
    world.era,
  );
  return available.slice(0, 3).map(t => ({
    id: t.id,
    name: t.name,
    desc: t.description,
    era: t.era,
  }));
}
