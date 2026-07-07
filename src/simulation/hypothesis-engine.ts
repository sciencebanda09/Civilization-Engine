import type { Agent, Hypothesis, WorldState } from '../types/index.js';
import type { LLMProvider } from '../llm/provider.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

let hypothesisCounter = 0;

export class HypothesisEngine {
  private hypotheses: Map<string, Hypothesis> = new Map();

  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  async generateHypothesis(agent: Agent, worldState: WorldState): Promise<Hypothesis | null> {
    const personaPrompt = this.prompts.buildAgentBasePersona({
      agentName: agent.name,
      archetype: agent.archetype,
      personalityTraitsCsv: agent.personalityTraits.join(', '),
      expertiseDescription: agent.expertiseDescription,
      goalsList: agent.goals.join('; '),
      relationshipSummary: agent.relationshipSummary,
      memoryDigest: agent.memoryDigest,
      worldStateSummary: JSON.stringify(worldState),
    });

    const prompt = this.prompts.buildHypothesisGeneration({
      agentBasePersona: personaPrompt,
      worldStateSummary: JSON.stringify(worldState),
      memoryDigest: agent.memoryDigest,
    });

    try {
      const result = await this.llm.generateJSON<{
        hypothesisTitle: string;
        hypothesisDescription: string;
        rationale: string;
        requiredExpertise: string[];
        estimatedDifficulty: 'low' | 'medium' | 'high';
        resourcesNeeded: string[];
      }>(prompt, {
        temperature: 0.7,
        maxTokens: 500,
        tier: 'big',
      });

      const hypothesis: Hypothesis = {
        id: `hyp_${++hypothesisCounter}`,
        title: result.hypothesisTitle,
        description: result.hypothesisDescription,
        rationale: result.rationale,
        requiredExpertise: result.requiredExpertise,
        estimatedDifficulty: result.estimatedDifficulty,
        resourcesNeeded: result.resourcesNeeded,
        proposerId: agent.id,
        status: 'proposed',
        createdAt: Date.now(),
      };

      this.hypotheses.set(hypothesis.id, hypothesis);
      logger.info(`Hypothesis generated: "${hypothesis.title}" by ${agent.name}`);
      return hypothesis;
    } catch (err) {
      logger.error(`Hypothesis generation failed for ${agent.name}: ${err}`);
      return null;
    }
  }

  getHypothesis(id: string): Hypothesis | undefined {
    return this.hypotheses.get(id);
  }

  getAllHypotheses(): Hypothesis[] {
    return Array.from(this.hypotheses.values());
  }

  getHypothesesByStatus(status: Hypothesis['status']): Hypothesis[] {
    return this.getAllHypotheses().filter((h) => h.status === status);
  }

  setStatus(id: string, status: Hypothesis['status']): void {
    const hyp = this.hypotheses.get(id);
    if (hyp) hyp.status = status;
  }

  getOpenHypotheses(): Hypothesis[] {
    return this.getAllHypotheses().filter(
      (h) => h.status === 'proposed' || h.status === 'team_forming',
    );
  }
}
