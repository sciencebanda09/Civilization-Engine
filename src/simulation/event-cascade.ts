import type { Agent, AgentOpinion } from '../types/index.js';
import { modifyTrust } from '../agents/opinions.js';
import { applyTrauma } from '../agents/personality.js';

export interface CascadeStep {
  id: string;
  condition: (state: CascadeState) => boolean;
  effect: (state: CascadeState) => string[];
  priority: number;
}

export interface CascadeState {
  epoch: number;
  season: string;
  events: string[];
  activeCascades: ActiveCascade[];
  resources: Record<string, number>;
  agents: Agent[];
  population: number;
  defenseLevel: number;
}

export interface ActiveCascade {
  id: string;
  name: string;
  step: number;
  steps: string[];
  severity: number;
  started: number;
  narrative: string[];
}

const CASCADE_DEFINITIONS: CascadeStep[] = [
  {
    id: 'drought_to_famine',
    priority: 10,
    condition: (s) => s.events.some(e => /drought|no rain|dry spell/i.test(e)) && (s.resources['food'] ?? 100) < 30,
    effect: (s) => {
      const events: string[] = [];
      events.push(`🌾 The drought worsens into famine! Food stores are critically low.`);
      s.resources['food'] = Math.max(0, (s.resources['food'] ?? 0) - 15);
      s.population = Math.max(10, s.population - Math.floor(Math.random() * 5));
      for (const agent of s.agents) {
        applyTrauma(agent, 'Famine');
        modifyTrust(agent, '', -5, 'blamed for food shortage', s.epoch);
      }
      return events;
    },
  },
  {
    id: 'famine_to_unrest',
    priority: 8,
    condition: (s) => s.events.some(e => /famine|starving|hunger/i.test(e)) && s.agents.length >= 2,
    effect: (s) => {
      const events: string[] = [];
      const target = s.agents.find(a => a.archetype === 'builder' || a.archetype === 'leader');
      const accuser = s.agents.find(a => a.archetype !== 'builder' && a.archetype !== 'leader');
      if (accuser && target) {
        modifyTrust(accuser, target.id, -20, 'blamed for famine', s.epoch);
        events.push(`⚡ ${accuser.name} blames ${target.name} for the famine! Tensions rise in the council.`);
      }
      return events;
    },
  },
  {
    id: 'unrest_to_revolt',
    priority: 5,
    condition: (s) => {
      const recentBlame = s.events.filter(e => /blame|tension|accuse/i.test(e)).length;
      return recentBlame >= 2;
    },
    effect: (s) => {
      const events: string[] = [];
      events.push(`💥 Civil unrest escalates into open revolt! The council chamber is in chaos.`);
      s.population = Math.max(15, s.population - Math.floor(Math.random() * 8));
      s.defenseLevel = Math.max(0, s.defenseLevel - 10);
      for (const agent of s.agents) {
        applyTrauma(agent, 'Revolt');
      }
      return events;
    },
  },
  {
    id: 'discovery_to_boom',
    priority: 7,
    condition: (s) => s.events.some(e => /discover|breakthrough|invent/i.test(e)) && (s.resources['food'] ?? 0) > 50,
    effect: (s) => {
      const events: string[] = [];
      const discName = s.events.find(e => /discover|breakthrough/i.test(e))?.substring(0, 30) ?? 'a discovery';
      events.push(`✦ ${discName} sparks an economic boom! Trade flourishes.`);
      s.resources['food'] = (s.resources['food'] ?? 0) + 20;
      s.resources['wood'] = (s.resources['wood'] ?? 0) + 15;
      s.population += Math.floor(Math.random() * 5) + 2;
      return events;
    },
  },
  {
    id: 'defeat_to_despair',
    priority: 6,
    condition: (s) => s.events.some(e => /defeat|lost|retreat|routed/i.test(e)) && s.population < 50,
    effect: (s) => {
      const events: string[] = [];
      events.push(`💔 After the defeat, despair grips the settlement. Some speak of abandoning the village.`);
      s.population = Math.max(10, s.population - Math.floor(Math.random() * 4));
      for (const agent of s.agents) {
        if (agent.personality.optimism > 30) agent.personality.optimism -= 15;
      }
      return events;
    },
  },
  {
    id: 'victory_to_confidence',
    priority: 6,
    condition: (s) => s.events.some(e => /victory|defeated|won|triumph/i.test(e)),
    effect: (s) => {
      const events: string[] = [];
      events.push(`🏆 The victory unites the people! Confidence soars.`);
      s.population += Math.floor(Math.random() * 3) + 1;
      s.defenseLevel += 5;
      for (const agent of s.agents) {
        agent.personality.optimism = Math.min(100, agent.personality.optimism + 5);
      }
      return events;
    },
  },
  {
    id: 'plague_to_recovery',
    priority: 5,
    condition: (s) => s.events.some(e => /plague|sickness|pestilence/i.test(e)) && s.events.filter(e => /plague|sickness/i.test(e)).length >= 2,
    effect: (s) => {
      const events: string[] = [];
      events.push(`🌿 The plague begins to subside. Survivors have immunity. New herbs are found.`);
      s.population += Math.floor(Math.random() * 3);
      if (s.agents.length > 0) {
        const healer = s.agents.find(a => a.archetype === 'scholar' || a.archetype === 'scientist');
        if (healer) events.push(`${healer.name} identifies medicinal herbs that help the sick.`);
      }
      return events;
    },
  },
  {
    id: 'prosperity_to_growth',
    priority: 4,
    condition: (s) => (s.resources['food'] ?? 0) > 150 && (s.resources['wood'] ?? 0) > 100,
    effect: (s) => {
      const events: string[] = [];
      events.push(`🌱 Abundant resources fuel rapid population growth!`);
      const growth = Math.floor(Math.random() * 8) + 3;
      s.population += growth;
      s.resources['food'] = Math.max(0, (s.resources['food'] ?? 0) - 20);
      s.resources['wood'] = Math.max(0, (s.resources['wood'] ?? 0) - 15);
      return events;
    },
  },
];

export class EventCascadeEngine {
  private activeCascades: ActiveCascade[] = [];
  private completedCascades: string[] = [];

  tick(state: CascadeState): string[] {
    const events: string[] = [];

    for (const def of CASCADE_DEFINITIONS) {
      if (this.completedCascades.includes(def.id)) continue;
      if (this.activeCascades.some(a => a.id === def.id)) continue;

      if (def.condition(state)) {
        const results = def.effect(state);
        events.push(...results);
        this.activeCascades.push({
          id: def.id,
          name: def.id.replace(/_/g, ' '),
          step: 0,
          steps: [],
          severity: def.priority,
          started: state.epoch,
          narrative: results,
        });
      }
    }

    // Check for multi-step cascade progression
    for (const cascade of this.activeCascades) {
      if (cascade.step < 2 && Math.random() < 0.3) {
        cascade.step++;
        cascade.narrative.push(`  → The ${cascade.name} continues to unfold...`);
      }
    }

    // Clean up old cascades
    this.activeCascades = this.activeCascades.filter(c => {
      if (c.started < state.epoch - 5) {
        this.completedCascades.push(c.id);
        return false;
      }
      return true;
    });

    return events;
  }

  getActiveNarratives(): string[] {
    return this.activeCascades.map(c => `  ${c.name} (step ${c.step + 1})`);
  }
}
