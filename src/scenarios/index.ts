import type { WorldState } from '../types/index.js';
import type { Agent } from '../types/index.js';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  worldState: WorldState;
  agents: Array<{
    name: string;
    archetype: Agent['archetype'];
    personalityTraits: string[];
    expertise: string[];
    expertiseDescription: string;
    goals: string[];
    relationshipSummary: string;
  }>;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'peaceful_valley',
    name: 'Peaceful Valley',
    description: 'A lush valley with abundant resources. Perfect for learning the ropes — but will complacency breed stagnation?',
    difficulty: 'easy',
    worldState: {
      era: 'Stone Age', epoch: 0,
      resources: { wood: 300, stone: 200, food: 500 },
      flags: {}, discoveries: [],
      populationNote: 'Small settlement of 80 people',
      enabledDomains: ['basic_toolmaking', 'foraging', 'shelter_building'],
    },
    agents: [
      { name: 'Kael', archetype: 'inventor', personalityTraits: ['curious', 'persistent'], expertise: ['toolmaking', 'stone_working'], expertiseDescription: 'Expert toolmaker and stone worker', goals: ['Improve tool quality', 'Discover stronger materials'], relationshipSummary: 'Known for practical innovations' },
      { name: 'Doren', archetype: 'scholar', personalityTraits: ['cautious', 'analytical'], expertise: ['botany', 'medicine'], expertiseDescription: 'Student of plants and healing', goals: ['Document medicinal plants'], relationshipSummary: 'Prefers careful study over risky experiments' },
      { name: 'Mira', archetype: 'explorer', personalityTraits: ['bold', 'adventurous'], expertise: ['navigation', 'mapping'], expertiseDescription: 'Explorer and mapmaker', goals: ['Map new territories'], relationshipSummary: 'Brings back new resources from travels' },
      { name: 'Thane', archetype: 'leader', personalityTraits: ['decisive', 'protective'], expertise: ['warfare', 'tactics'], expertiseDescription: 'Military leader and strategist', goals: ['Defend the settlement', 'Train warriors'], relationshipSummary: 'Keeps the settlement safe' },
      { name: 'Elara', archetype: 'crafter', personalityTraits: ['meticulous', 'creative'], expertise: ['pottery', 'weaving'], expertiseDescription: 'Skilled artisan with clay and fibers', goals: ['Develop new crafting techniques', 'Create trade goods'], relationshipSummary: 'Her crafts are prized' },
    ],
  },
  {
    id: 'volcanic_winter',
    name: 'Volcanic Winter',
    description: 'A massive eruption has blotted out the sun. Food is scarce, temperatures drop. Can your civilization survive the long night?',
    difficulty: 'hard',
    worldState: {
      era: 'Stone Age', epoch: 0,
      resources: { wood: 50, stone: 150, food: 30 },
      flags: { volcanic_winter: 'active' },
      discoveries: [],
      populationNote: 'Remnants of a tribe, 30 people huddled for warmth',
      enabledDomains: ['basic_toolmaking', 'foraging', 'shelter_building'],
    },
    agents: [
      { name: 'Rogan', archetype: 'leader', personalityTraits: ['stoic', 'resourceful'], expertise: ['warfare', 'tactics'], expertiseDescription: 'Hardened survivor and organizer', goals: ['Keep everyone alive', 'Find food'], relationshipSummary: 'The voice of reason in chaos' },
      { name: 'Fenra', archetype: 'explorer', personalityTraits: ['determined', 'observant'], expertise: ['navigation', 'mapping'], expertiseDescription: 'Scout who knows the lands', goals: ['Find new food sources', 'Map safe routes'], relationshipSummary: 'Braves the ash-falls to find resources' },
      { name: 'Bram', archetype: 'inventor', personalityTraits: ['creative', 'desperate'], expertise: ['toolmaking', 'shelter_building'], expertiseDescription: 'Makes something from nothing', goals: ['Improve shelter insulation', 'Create better hunting tools'], relationshipSummary: 'Ingenuity under pressure' },
    ],
  },
  {
    id: 'rich_valley',
    name: 'Rich Valley',
    description: 'A fertile valley overflowing with resources. Populations boom. But rapid growth brings new problems — disease, conflict, and complacency.',
    difficulty: 'normal',
    worldState: {
      era: 'Stone Age', epoch: 0,
      resources: { wood: 500, stone: 400, food: 800 },
      flags: {}, discoveries: [],
      populationNote: 'Thriving settlement of 200 people',
      enabledDomains: ['basic_toolmaking', 'foraging', 'shelter_building', 'basic_farming'],
    },
    agents: [
      { name: 'Seraphina', archetype: 'leader', personalityTraits: ['ambitious', 'charismatic'], expertise: ['diplomacy', 'organization'], expertiseDescription: 'Natural leader of growing settlement', goals: ['Expand territory', 'Establish trade'], relationshipSummary: 'Unites people under a common vision' },
      { name: 'Torvin', archetype: 'builder', personalityTraits: ['diligent', 'practical'], expertise: ['construction', 'stone_working'], expertiseDescription: 'Master builder and architect', goals: ['Build permanent structures', 'Develop irrigation'], relationshipSummary: 'Turns resources into infrastructure' },
      { name: 'Lyra', archetype: 'scholar', personalityTraits: ['curious', 'methodical'], expertise: ['botany', 'medicine', 'astronomy'], expertiseDescription: 'Student of nature and stars', goals: ['Develop farming techniques', 'Create a calendar'], relationshipSummary: 'Her observations improve crop yields' },
      { name: 'Garrick', archetype: 'merchant', personalityTraits: ['shrewd', 'gregarious'], expertise: ['trade', 'navigation'], expertiseDescription: 'Traveling trader', goals: ['Establish trade routes', 'Find luxury goods'], relationshipSummary: 'Connects the settlement to the outside world' },
      { name: 'Vex', archetype: 'warrior', personalityTraits: ['protective', 'suspicious'], expertise: ['warfare', 'tactics'], expertiseDescription: 'Settlement guardian', goals: ['Build defenses', 'Train militia'], relationshipSummary: 'Keeps the growing population safe from threats' },
    ],
  },
  {
    id: 'desert_oasis',
    name: 'Desert Oasis',
    description: 'A tiny oasis in a vast desert. Wood and water are precious. Stone is plentiful. Innovation is the only path to survival.',
    difficulty: 'hard',
    worldState: {
      era: 'Stone Age', epoch: 0,
      resources: { wood: 20, stone: 500, food: 80 },
      flags: { arid_environment: 'active' },
      discoveries: [],
      populationNote: 'Oasis dwellers, 25 people',
      enabledDomains: ['basic_toolmaking', 'shelter_building'],
    },
    agents: [
      { name: 'Zara', archetype: 'inventor', personalityTraits: ['ingenious', 'patient'], expertise: ['toolmaking', 'stone_working', 'irrigation'], expertiseDescription: 'Makes the most of scarce resources', goals: ['Develop irrigation', 'Create efficient tools'], relationshipSummary: 'Her inventions stretch every resource' },
      { name: 'Omar', archetype: 'explorer', personalityTraits: ['enduring', 'curious'], expertise: ['navigation', 'survival'], expertiseDescription: 'Desert survival expert', goals: ['Find water sources', 'Map safe passages'], relationshipSummary: 'Knows the desert\'s secrets' },
      { name: 'Nadia', archetype: 'leader', personalityTraits: ['wise', 'fair'], expertise: ['diplomacy', 'organization'], expertiseDescription: 'Keeps the oasis community together', goals: ['Maintain peace', 'Ration resources fairly'], relationshipSummary: 'Her leadership prevents conflicts over scarce resources' },
    ],
  },
  {
    id: 'island_colony',
    name: 'Island Colony',
    description: 'A small island far from any mainland. Resources are limited but the sea provides. No external threats — but no escape either.',
    difficulty: 'normal',
    worldState: {
      era: 'Stone Age', epoch: 0,
      resources: { wood: 100, stone: 60, food: 150, fish: 200 },
      flags: { isolated: 'true' },
      discoveries: [],
      populationNote: 'Shipwreck survivors, 40 people',
      enabledDomains: ['basic_toolmaking', 'foraging', 'shelter_building', 'fishing'],
    },
    agents: [
      { name: 'Caelan', archetype: 'explorer', personalityTraits: ['adventurous', 'restless'], expertise: ['navigation', 'shipbuilding', 'fishing'], expertiseDescription: 'Sailor and fisherman', goals: ['Build better boats', 'Explore beyond the reef'], relationshipSummary: 'Dreams of escaping the island' },
      { name: 'Maren', archetype: 'builder', personalityTraits: ['practical', 'patient'], expertise: ['construction', 'toolmaking'], expertiseDescription: 'Turns island resources into shelter', goals: ['Build permanent village', 'Develop island resources'], relationshipSummary: 'Makes the island feel like home' },
      { name: 'Sage', archetype: 'scholar', personalityTraits: ['reflective', 'observant'], expertise: ['botany', 'medicine', 'astronomy'], expertiseDescription: 'Studies island flora and stars', goals: ['Document island plants', 'Create a calendar from the stars'], relationshipSummary: 'Her knowledge keeps everyone healthy' },
    ],
  },
  {
    id: 'iron_fist',
    name: 'Iron Fist',
    description: 'A militaristic tribe has conquered the region. Resources are plundered, people are oppressed. Revolution or rebellion?',
    difficulty: 'extreme',
    worldState: {
      era: 'Iron Age', epoch: 50,
      resources: { wood: 40, stone: 30, food: 60, iron: 20, weapons: 50 },
      flags: { oppressive_regime: 'active', rebellion_underground: 'active' },
      discoveries: [{ id: 'disc_iron', title: 'Iron Smelting', description: 'Iron ore can be smelted into strong metal.', epochDiscovered: 30, discoveredBy: ['Conquerors'], enabledDomains: ['iron_working', 'advanced_weaponry'] }],
      populationNote: 'Subjugated population of 300 under warlord control',
      enabledDomains: ['basic_toolmaking', 'foraging', 'shelter_building', 'iron_working', 'advanced_weaponry'],
    },
    agents: [
      { name: 'Valerius', archetype: 'leader', personalityTraits: ['strategic', 'inspiring'], expertise: ['warfare', 'tactics', 'diplomacy'], expertiseDescription: 'Underground rebellion leader', goals: ['Free the people', 'Assassinate the warlord'], relationshipSummary: 'The spark of hope in dark times' },
      { name: 'Helia', archetype: 'inventor', personalityTraits: ['cunning', 'resourceful'], expertise: ['toolmaking', 'iron_working', 'engineering'], expertiseDescription: 'Makes weapons for the rebellion', goals: ['Develop superior weapons', 'Build siege equipment'], relationshipSummary: 'Her forge fuels the revolution' },
      { name: 'Corvus', archetype: 'scholar', personalityTraits: ['secretive', 'wise'], expertise: ['medicine', 'astronomy', 'philosophy'], expertiseDescription: 'Keeper of forbidden knowledge', goals: ['Preserve culture', 'Teach the next generation'], relationshipSummary: 'Holds the tribes history and knowledge' },
      { name: 'Nyx', archetype: 'explorer', personalityTraits: ['stealthy', 'loyal'], expertise: ['navigation', 'survival', 'espionage'], expertiseDescription: 'Scout and spy', goals: ['Map enemy positions', 'Establish escape routes'], relationshipSummary: 'Her intelligence is the rebellion\'s eyes and ears' },
    ],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find(s => s.id === id);
}

export function pickRandomScenario(): Scenario {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
}

export function listScenarios(): string {
  return SCENARIOS.map((s, i) =>
    `  ${i + 1}. ${s.name} (${s.difficulty})${s.difficulty === 'easy' ? ' ★' : s.difficulty === 'hard' ? ' 💀' : s.difficulty === 'extreme' ? ' ☠️' : ''}\n     ${s.description}`
  ).join('\n');
}

const AGENT_NAMES = [
  'Aldric', 'Bryn', 'Cassia', 'Doran', 'Eira', 'Finnian', 'Greta', 'Hale',
  'Iris', 'Joric', 'Kara', 'Leif', 'Maren', 'Niall', 'Oona', 'Pell',
  'Runa', 'Sigrid', 'Tova', 'Ulf', 'Veda', 'Wynn', 'Xara', 'Yorik',
  'Zelda', 'Aric', 'Bera', 'Cedric', 'Dagny', 'Elara', 'Fenris', 'Gunnar',
  'Hilda', 'Ivar', 'Jorunn', 'Kellan', 'Lira', 'Magnus', 'Nora', 'Orin',
  'Pyra', 'Quinn', 'Rig', 'Soren', 'Thyra', 'Una', 'Vidar', 'Willow',
  'Yrsa', 'Zane', 'Asta', 'Bjorn', 'Corin', 'Disa', 'Egil', 'Freya',
  'Gerd', 'Hakon', 'Ingrid',
];

const ALL_ARCHETYPES: Array<{ name: string; expertise: string[]; expertiseDesc: string; goals: string[] }> = [
  { name: 'inventor', expertise: ['toolmaking', 'stone_working', 'engineering'], expertiseDesc: 'Creator of new tools and devices', goals: ['Invent useful devices', 'Improve technology'] },
  { name: 'scholar', expertise: ['botany', 'medicine', 'astronomy'], expertiseDesc: 'Student of nature and the cosmos', goals: ['Document knowledge', 'Understand natural phenomena'] },
  { name: 'explorer', expertise: ['navigation', 'mapping', 'survival'], expertiseDesc: 'Fearless traveler and scout', goals: ['Map unknown territory', 'Discover new resources'] },
  { name: 'leader', expertise: ['warfare', 'tactics', 'diplomacy'], expertiseDesc: 'Natural leader and strategist', goals: ['Unite the people', 'Plan for the future'] },
  { name: 'crafter', expertise: ['pottery', 'weaving', 'woodworking'], expertiseDesc: 'Skilled artisan and maker', goals: ['Create beautiful objects', 'Master new materials'] },
  { name: 'builder', expertise: ['construction', 'stone_working', 'architecture'], expertiseDesc: 'Master of structures and infrastructure', goals: ['Build lasting monuments', 'Design efficient shelters'] },
  { name: 'merchant', expertise: ['trade', 'negotiation', 'navigation'], expertiseDesc: 'Traveling trader and negotiator', goals: ['Establish trade routes', 'Accumulate wealth'] },
  { name: 'warrior', expertise: ['combat', 'tactics', 'weapon_crafting'], expertiseDesc: 'Fierce defender and fighter', goals: ['Protect the settlement', 'Train others in combat'] },
  { name: 'diplomat', expertise: ['negotiation', 'languages', 'diplomacy'], expertiseDesc: 'Skilled negotiator and bridge-builder', goals: ['Form alliances', 'Resolve conflicts peacefully'] },
  { name: 'scientist', expertise: ['alchemy', 'astronomy', 'mathematics'], expertiseDesc: 'Systematic investigator of nature', goals: ['Conduct experiments', 'Discover natural laws'] },
  { name: 'philosopher', expertise: ['ethics', 'logic', 'writing'], expertiseDesc: 'Deep thinker and moral guide', goals: ['Develop a code of ethics', 'Record oral traditions'] },
  { name: 'artist', expertise: ['painting', 'sculpture', 'music'], expertiseDesc: 'Creative soul and cultural keeper', goals: ['Create lasting art', 'Inspire the people'] },
  { name: 'farmer', expertise: ['agriculture', 'botany', 'irrigation'], expertiseDesc: 'Tiller of soil and grower of food', goals: ['Improve crop yields', 'Develop sustainable farming'] },
  { name: 'survivalist', expertise: ['hunting', 'tracking', 'foraging'], expertiseDesc: 'Wilderness expert and provider', goals: ['Secure food sources', 'Survive harsh conditions'] },
];

const PERSONALITY_TRAIT_POOL = [
  'curious', 'cautious', 'bold', 'meticulous', 'creative', 'analytical',
  'patient', 'ambitious', 'stoic', 'resourceful', 'adventurous', 'determined',
  'observant', 'shrewd', 'protective', 'suspicious', 'wise', 'fair',
  'practical', 'inspiring', 'secretive', 'loyal', 'strategic', 'cunning',
  'ingenious', 'enduring', 'stoic', 'gregarious', 'diligent', 'reflective',
  'friendly', 'perceptive', 'brave', 'methodical', 'decisive', 'charismatic',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

let nameIndex = 0;

export function generateLargeScenario(agentCount: number): Scenario {
  const agents = [];
  nameIndex = 0;
  for (let i = 0; i < agentCount; i++) {
    const arch = ALL_ARCHETYPES[i % ALL_ARCHETYPES.length]!;
    const name = AGENT_NAMES[nameIndex % AGENT_NAMES.length]!;
    nameIndex++;
    const traits = pickN(PERSONALITY_TRAIT_POOL, 2);
    const expertise = pickN(arch.expertise, 1 + Math.floor(Math.random() * 2));
    agents.push({
      name,
      archetype: arch.name as Agent['archetype'],
      personalityTraits: traits,
      expertise,
      expertiseDescription: arch.expertiseDesc,
      goals: pickN(arch.goals, 1 + Math.floor(Math.random())),
      relationshipSummary: `Known as a ${pickRandom(['capable', 'promising', 'reliable', 'curious', 'steadfast'])} ${arch.name}`,
    });
  }

  const popNote = agentCount <= 10 ? `Small group of ${agentCount * 10} people`
    : agentCount <= 30 ? `Growing settlement of ${agentCount * 10} people`
    : agentCount <= 50 ? `Thriving town of ${agentCount * 10} people`
    : `Sprawling population of ${agentCount * 10} people`;

  return {
    id: 'large_civilization',
    name: `Large Civilization (${agentCount} agents)`,
    description: `A large-scale simulation with ${agentCount} agents. New discoveries emerge from the chaos of many minds working in parallel.`,
    difficulty: 'normal',
    worldState: {
      era: 'Stone Age',
      epoch: 0,
      resources: { wood: 300, stone: 200, food: 500 },
      flags: {},
      discoveries: [],
      populationNote: popNote,
      enabledDomains: ['basic_toolmaking', 'foraging', 'shelter_building'],
    },
    agents,
  };
}
