import type { Agent, ExperimentDesign, ExperimentOutcome, WorldState } from '../types/index.js';
import type { LLMProvider } from '../llm/provider.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

export class WorldSimulator {
  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  async adjudicate(
    experiment: ExperimentDesign,
    teamMembers: Agent[],
    worldState: WorldState,
  ): Promise<ExperimentOutcome | null> {
    const teamRoster = teamMembers
      .map(
        (m) =>
          `${m.id} | ${m.name} | archetype: ${m.archetype} | expertise: ${m.expertise.join(', ')}`,
      )
      .join('\n');

    const prompt = this.prompts.buildExperimentAdjudication({
      experimentDesignJson: JSON.stringify(experiment),
      teamRoster,
      worldStateSummary: JSON.stringify(worldState),
    });

    try {
      const result = await this.llm.generateJSON<{
        outcome: 'success' | 'partial' | 'failure';
        narrative: string;
        discovery: {
          title: string | null;
          description: string | null;
          worldStateDelta: Record<string, string>;
          enabledFutureDomains: string[];
        } | null;
        lessonLearned: string;
        agentMemoryNotes: Array<{
          agentId: string;
          memorySummary: string;
        }>;
      }>(prompt, {
        temperature: 0.5,
        maxTokens: 600,
      });

      const outcome: ExperimentOutcome = {
        outcome: result.outcome,
        narrative: result.narrative,
        discovery: result.discovery
          ? {
              title: result.discovery.title,
              description: result.discovery.description,
              worldStateDelta: result.discovery.worldStateDelta,
              enabledFutureDomains: result.discovery.enabledFutureDomains,
            }
          : null,
        lessonLearned: result.lessonLearned,
        agentMemoryNotes: result.agentMemoryNotes,
      };

      logger.info(
        `Experiment adjudication: ${outcome.outcome} — "${outcome.discovery?.title ?? 'no discovery'}"`,
      );
      return outcome;
    } catch (err) {
      logger.error(`Experiment adjudication failed: ${err}`);
      return null;
    }
  }

  applyOutcomeToWorld(
    worldState: WorldState,
    outcome: ExperimentOutcome,
  ): WorldState {
    const newState: WorldState = {
      ...worldState,
      epoch: worldState.epoch,
      resources: { ...worldState.resources },
      flags: { ...worldState.flags },
      discoveries: [...worldState.discoveries],
      enabledDomains: [...worldState.enabledDomains],
    };

    if (outcome.discovery?.title) {
      const discovery = {
        id: `disc_${worldState.epoch}_${worldState.discoveries.length + 1}`,
        title: outcome.discovery.title,
        description: outcome.discovery.description ?? '',
        epochDiscovered: worldState.epoch,
        discoveredBy: outcome.agentMemoryNotes.map((n) => n.agentId),
        enabledDomains: outcome.discovery.enabledFutureDomains,
      };
      newState.discoveries.push(discovery);

      for (const [key, value] of Object.entries(outcome.discovery.worldStateDelta)) {
        if (key.startsWith('flag_')) {
          newState.flags[key.replace('flag_', '')] = value;
        } else {
          const existing = newState.resources[key] ?? 0;
          const delta = parseInt(value, 10);
          if (!isNaN(delta)) {
            newState.resources[key] = existing + delta;
          }
        }
      }

      for (const domain of outcome.discovery.enabledFutureDomains) {
        if (!newState.enabledDomains.includes(domain)) {
          newState.enabledDomains.push(domain);
        }
      }
    }

    return newState;
  }
}
