import type { Agent, AgentPersonality, PoliticalLeaning } from '../types/index.js';

const ARCHETYPE_DEFAULTS: Record<string, Partial<AgentPersonality>> = {
  scientist: { trust: 40, optimism: 50, riskTolerance: 30, politicalLeaning: 'scholar' },
  explorer: { trust: 60, optimism: 80, riskTolerance: 80, politicalLeaning: 'expansionist' },
  builder: { trust: 50, optimism: 60, riskTolerance: 40, politicalLeaning: 'isolationist' },
  merchant: { trust: 30, optimism: 70, riskTolerance: 60, politicalLeaning: 'diplomatic' },
  warrior: { trust: 30, optimism: 40, riskTolerance: 70, politicalLeaning: 'militarist' },
  diplomat: { trust: 70, optimism: 60, riskTolerance: 30, politicalLeaning: 'diplomatic' },
  philosopher: { trust: 50, optimism: 40, riskTolerance: 20, politicalLeaning: 'scholar' },
  artist: { trust: 60, optimism: 80, riskTolerance: 50, politicalLeaning: 'traditionalist' },
  farmer: { trust: 70, optimism: 60, riskTolerance: 30, politicalLeaning: 'isolationist' },
  leader: { trust: 50, optimism: 70, riskTolerance: 50, politicalLeaning: 'expansionist' },
  inventor: { trust: 40, optimism: 70, riskTolerance: 80, politicalLeaning: 'scholar' },
  scholar: { trust: 50, optimism: 50, riskTolerance: 20, politicalLeaning: 'scholar' },
  crafter: { trust: 60, optimism: 60, riskTolerance: 40, politicalLeaning: 'traditionalist' },
  survivalist: { trust: 20, optimism: 30, riskTolerance: 60, politicalLeaning: 'isolationist' },
};

const OPTIMIZATION_TARGETS: Record<string, string> = {
  scientist: 'maximize_knowledge',
  explorer: 'maximize_exploration',
  builder: 'maximize_infrastructure',
  merchant: 'maximize_wealth',
  warrior: 'maximize_security',
  diplomat: 'maximize_harmony',
  philosopher: 'maximize_wisdom',
  artist: 'maximize_culture',
  farmer: 'maximize_food',
  leader: 'maximize_power',
  inventor: 'maximize_technology',
  scholar: 'maximize_discoveries',
  crafter: 'maximize_quality',
  survivalist: 'maximize_safety',
};

let familyCounter = 0;

export function createPersonality(archetype: string, traits: string[]): AgentPersonality {
  const defaults = ARCHETYPE_DEFAULTS[archetype] ?? { trust: 50, optimism: 50, riskTolerance: 50, politicalLeaning: 'diplomatic' as PoliticalLeaning };

  const p: AgentPersonality = {
    trust: (defaults.trust ?? 50) + randomMod(10),
    optimism: (defaults.optimism ?? 50) + randomMod(10),
    riskTolerance: (defaults.riskTolerance ?? 50) + randomMod(10),
    politicalLeaning: defaults.politicalLeaning ?? 'diplomatic',
    knownFor: [],
    trauma: [],
    age: 20 + Math.floor(Math.random() * 20),
    familyLine: `family_${++familyCounter}`,
    dynasticReputation: 50,
  };

  for (const t of traits) {
    const tLow = t.toLowerCase();
    if (tLow.includes('brave') || tLow.includes('bold')) p.riskTolerance = Math.min(100, p.riskTolerance + 15);
    if (tLow.includes('cautious') || tLow.includes('careful')) p.riskTolerance = Math.max(0, p.riskTolerance - 15);
    if (tLow.includes('friendly') || tLow.includes('kind')) p.trust = Math.min(100, p.trust + 15);
    if (tLow.includes('suspicious') || tLow.includes('distrust')) p.trust = Math.max(0, p.trust - 15);
    if (tLow.includes('curious')) p.optimism = Math.min(100, p.optimism + 10);
    if (tLow.includes('pessimistic')) p.optimism = Math.max(0, p.optimism - 15);
  }

  return p;
}

export function getOptimizationTarget(archetype: string): string {
  return OPTIMIZATION_TARGETS[archetype] ?? 'maximize_survival';
}

export function applyTrauma(agent: Agent, event: string): void {
  agent.personality.trauma.push(event);
  agent.personality.optimism = Math.max(0, agent.personality.optimism - 8);
  agent.personality.trust = Math.max(0, agent.personality.trust - 5);
  if (agent.personality.riskTolerance > 50) {
    agent.personality.riskTolerance = Math.max(0, agent.personality.riskTolerance - 10);
  } else {
    agent.personality.riskTolerance = Math.min(100, agent.personality.riskTolerance + 10);
  }
}

export function applyVictory(agent: Agent, achievement: string): void {
  agent.personality.knownFor.push(achievement);
  agent.personality.optimism = Math.min(100, agent.personality.optimism + 5);
  agent.personality.dynasticReputation = Math.min(100, agent.personality.dynasticReputation + 5);
  if (agent.personality.riskTolerance < 50) {
    agent.personality.riskTolerance = Math.min(100, agent.personality.riskTolerance + 5);
  }
}

export function ageAgent(agent: Agent, years: number): void {
  agent.personality.age += years;
  if (years > 5 && Math.random() < 0.1) {
    agent.personality.riskTolerance = Math.max(0, agent.personality.riskTolerance - 3);
    agent.personality.optimism = Math.max(0, agent.personality.optimism - 2);
  }
}

export function personalitySummary(agent: Agent): string {
  const p = agent.personality;
  const parts: string[] = [
    `Age: ${p.age}`,
    `Trust: ${p.trust}`,
    `Optimism: ${p.optimism}`,
    `Risk: ${p.riskTolerance}`,
    `Lean: ${p.politicalLeaning}`,
  ];
  if (p.knownFor.length > 0) parts.push(`Known for: ${p.knownFor.join(', ')}`);
  if (p.trauma.length > 0) parts.push(`Trauma: ${p.trauma.length} events`);
  return parts.join(' | ');
}

function randomMod(range: number): number {
  return Math.floor(Math.random() * range) - Math.floor(range / 2);
}
