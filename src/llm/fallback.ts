import { LLMProvider, LLMOptions } from './provider.js';
import { parseLLMJSON } from '../utils/json-parser.js';
import { logger } from '../utils/logger.js';

let fallbackCounter = 0;

const HYPOTHESES = [
  { title: 'Sharper Stone Edges', desc: 'We can improve cutting efficiency by grinding stone edges against harder rocks.', expertise: ['toolmaking', 'stone_working'], diff: 'low', resources: ['stone', 'sand'] },
  { title: 'Fire-Hardened Spear Tips', desc: 'Hardening wooden spear tips in fire makes them last longer in hunts.', expertise: ['toolmaking', 'warfare'], diff: 'low', resources: ['wood', 'fire'] },
  { title: 'Woven Grass Baskets', desc: 'We can weave grass into containers for gathering and storing food.', expertise: ['weaving', 'foraging'], diff: 'low', resources: ['grass', 'reeds'] },
  { title: 'Medicinal Herb Identification', desc: 'Catalog which local plants reduce swelling or stop bleeding.', expertise: ['botany', 'medicine'], diff: 'medium', resources: ['herbs', 'water'] },
  { title: 'River Water Storage', desc: 'Dig clay-lined pits near the river to store water during dry spells.', expertise: ['shelter_building', 'foraging'], diff: 'medium', resources: ['clay', 'stone', 'labor'] },
  { title: 'Stone Axe Handle Binding', desc: 'Bind stone axe heads to wooden handles with soaked leather strips.', expertise: ['toolmaking', 'stone_working'], diff: 'low', resources: ['wood', 'leather', 'stone'] },
  { title: 'Smoke Curing Meat', desc: 'Hang meat over a slow fire to preserve it beyond the usual few days.', expertise: ['foraging', 'shelter_building'], diff: 'low', resources: ['wood', 'fire'] },
  { title: 'River Fish Traps', desc: 'Build funnel-shaped stone weirs in shallows to trap fish automatically.', expertise: ['foraging', 'toolmaking'], diff: 'medium', resources: ['stone', 'wood', 'reeds'] },
  { title: 'Clay Pot Hardening', desc: 'Firing clay pots in a hot hearth makes them waterproof and durable.', expertise: ['pottery', 'toolmaking'], diff: 'low', resources: ['clay', 'fire', 'water'] },
  { title: 'Navigating by Stars', desc: 'Learn to use the North Star to travel at night without getting lost.', expertise: ['navigation', 'mapping'], diff: 'medium', resources: [] },
];

const NARRATIVES = [
  { narrative: 'The team carried out the experiment carefully. Results were promising and the new knowledge spreads through the settlement.', lesson: 'Methodical testing converts observation into reliable knowledge.' },
  { narrative: 'After several attempts the team found a technique that works reliably, though not as efficiently as hoped.', lesson: 'Iteration improves outcomes even when initial results are mixed.' },
  { narrative: 'The experiment worked beyond expectations. The new discovery is immediately useful to everyone.', lesson: 'Bold ideas backed by solid teamwork can produce breakthrough results.' },
  { narrative: 'The team documented their process as they worked, ensuring the technique can be taught to others.', lesson: 'Documentation turns individual skill into collective knowledge.' },
  { narrative: 'A creative modification to the original plan led to an unexpected but valuable discovery.', lesson: 'Flexibility during experimentation can yield serendipitous results.' },
  { narrative: 'The experiment required more resources than anticipated, but the team adapted and still achieved a positive result.', lesson: 'Resourcefulness matters as much as raw resources.' },
];

const DISCOVERY_BONUSES = [
  { delta: { food: '+5' }, domains: ['foraging', 'food_preservation'] },
  { delta: { tool_quality: '+2' }, domains: ['advanced_toolmaking'] },
  { delta: { defense: '+3' }, domains: ['fortification'] },
  { delta: { health: '+3' }, domains: ['medicine', 'herbalism'] },
  { delta: { shelter: '+5' }, domains: ['construction'] },
  { delta: { storage: '+4' }, domains: ['logistics', 'trade'] },
  { delta: { food: '+3', tool_quality: '+1' }, domains: ['foraging', 'crafting'] },
];

function pick<T>(arr: T[]): T {
  return arr[(fallbackCounter++) % arr.length];
}

function makeHypothesisFallback(): string {
  const h = pick(HYPOTHESES);
  return JSON.stringify({
    hypothesis_title: h.title,
    hypothesis_description: h.desc,
    rationale: `As someone with expertise in ${h.expertise.join(', ')}, I believe this is a practical next step.`,
    required_expertise: h.expertise,
    estimated_difficulty: h.diff,
    resources_needed: h.resources,
  });
}

function makeAdjudicationFallback(): string {
  const n = pick(NARRATIVES);
  const bonus = pick(DISCOVERY_BONUSES);
  const title = pick(['Refined Technique', 'Improved Method', 'New Discovery', 'Breakthrough', 'Practical Innovation']);
  return JSON.stringify({
    outcome: Math.random() < 0.2 ? 'partial' : 'success',
    narrative: n.narrative,
    discovery: {
      title,
      description: `A practical improvement developed through experimentation that enhances the civilization's capabilities.`,
      world_state_delta: bonus.delta,
      enabled_future_domains: bonus.domains,
    },
    lesson_learned: n.lesson,
    agent_memory_notes: '{{agent_memory_notes}}',
  });
}

const FALLBACK_RESPONSES: Record<string, () => string> = {
  'fast, cheap decision filter': () => JSON.stringify({
    wants_to_act: true,
    action_type: 'propose_hypothesis',
    reason: 'Epoch change warrants investigation',
    urgency: 'medium',
  }),
  'spotted an opportunity for progress': makeHypothesisFallback,
  'team-formation reasoner': () => JSON.stringify({
    team_formed: true,
    selected_agent_ids: [],
    team_rationale: 'Proposer has sufficient expertise for initial investigation.',
    excluded_notable_candidates: [],
  }),
  'working debate with your research team': () => JSON.stringify({
    dialogue: pick(['This approach is promising but needs careful testing.', 'I think we should start small and scale up.', 'The resources required are within our current means.', 'We should document everything so others can repeat this.']),
    stance: 'propose_modification',
    modification_proposed: 'Add a second round of controlled tests',
    final_confidence: 0.6 + Math.random() * 0.3,
  }),
  'neutral synthesis reasoner': () => JSON.stringify({
    final_hypothesis: pick(['Systematic testing of the proposed method under controlled conditions.', 'A practical experiment comparing multiple approaches side by side.', 'An incremental improvement building on what we already know works.']),
    experiment_design: pick(['Run three trials with varying parameters and measure outcomes.', 'Divide into two groups for parallel testing of different variables.', 'Conduct a single rigorous test with careful documentation.']),
    team_confidence: 0.5 + Math.random() * 0.3,
    identified_risks: ['Limited sample size', 'Measurement imprecision'],
    resources_committed: ['labor', 'materials', 'time'],
  }),
  'impartial world simulator': makeAdjudicationFallback,
  'Compress the following event': () => JSON.stringify({
    memory_summary: pick(['I participated in an experiment that taught me something new.', 'Working with the team on this discovery was enlightening.', 'The experiment results were encouraging and I learned from the process.']),
    memory_type: 'discovery',
    salience: 0.6 + Math.random() * 0.3,
    linked_entities: [],
  }),
  'civilization\'s chronicler': () => JSON.stringify({
    epoch_title: pick([null, 'A Period of Learning', 'Quiet Progress', 'Foundations Laid', 'Building Knowledge']),
    summary: pick(['A quiet epoch passed with gradual progress.', 'The settlement continued its daily routines while experiments advanced.', 'Knowledge accumulated steadily through methodical work.', 'A routine epoch with subtle but meaningful progress.']),
    notable_discoveries: [],
    notable_failures: [],
    population_note: null,
  }),
  'Last N EPOCHS LOG': () => JSON.stringify({
    is_healthy: true,
    issue_type: 'none',
    likely_cause: 'N/A',
    suggested_parameter_change: 'N/A',
  }),
};

function findFallback(prompt: string): (() => string) | null {
  for (const [key, fn] of Object.entries(FALLBACK_RESPONSES)) {
    if (prompt.includes(key)) {
      return fn;
    }
  }
  return null;
}

export class FallbackLLMProvider implements LLMProvider {
  constructor(private primary: LLMProvider) {}

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    try {
      const result = await this.primary.generate(prompt, options);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('rate limit');
      if (isQuota) {
        logger.warn(`Primary LLM quota exceeded, using fallback response`);
      } else {
        logger.warn(`Primary LLM failed (${msg}), using fallback response`);
      }

      const fallbackFn = findFallback(prompt);
      if (fallbackFn) {
        let response = fallbackFn();
        if (prompt.includes('team-formation reasoner')) {
          const allIds = [...prompt.matchAll(/(agent_\d+)/g)].map(m => m[1]);
          const parsed = JSON.parse(response) as Record<string, unknown>;
          parsed['selected_agent_ids'] = [...new Set(allIds)];
          return JSON.stringify(parsed);
        }
        if (prompt.includes('impartial world simulator')) {
          const agentIds = [...prompt.matchAll(/(agent_\d+)/g)].map(m => m[1]);
          const notes = agentIds.map((id: string) => ({
            agent_id: id,
            memory_summary: `Participated in the experiment.`,
          }));
          response = response.replace(
            '"{{agent_memory_notes}}"',
            JSON.stringify(notes),
          );
        }
        return response;
      }

      const idMatch = prompt.match(/(agent_\d+)/);
      return JSON.stringify({
        team_formed: true,
        selected_agent_ids: idMatch ? [idMatch[1]!] : [],
        team_rationale: 'Fallback: using available expertise.',
        excluded_notable_candidates: [],
      });
    }
  }

  async generateJSON<T>(prompt: string, options?: LLMOptions): Promise<T> {
    const result = await this.generate(prompt, options);
    return parseLLMJSON<T>(result);
  }
}
