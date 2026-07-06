import type { DebateTurn, ExperimentDesign, Agent } from '../types/index.js';
import type { LLMProvider } from '../llm/provider.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

export class DebateSynthesis {
  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  async synthesize(
    turns: DebateTurn[],
    teamMembers: Agent[],
  ): Promise<ExperimentDesign | null> {
    const transcript = turns
      .map(
        (t) =>
          `[Turn ${t.turnNumber}] ${t.agentId}: "${t.dialogue}" (stance: ${t.stance}, modification: ${t.modificationProposed ?? 'none'}, confidence: ${t.finalConfidence ?? 'N/A'})`,
      )
      .join('\n');

    const prompt = this.prompts.buildDebateSynthesis({
      debateTranscript: transcript,
    });

    try {
      const result = await this.llm.generateJSON<{
        finalHypothesis: string;
        experimentDesign: string;
        teamConfidence: number;
        identifiedRisks: string[];
        resourcesCommitted: string[];
      }>(prompt, {
        temperature: 0.3,
        maxTokens: 500,
      });

      const design: ExperimentDesign = {
        finalHypothesis: result.finalHypothesis,
        experimentDesign: result.experimentDesign,
        teamConfidence: result.teamConfidence,
        identifiedRisks: result.identifiedRisks,
        resourcesCommitted: result.resourcesCommitted,
      };

      logger.info(`Debate synthesized: "${design.finalHypothesis.substring(0, 60)}..."`);
      return design;
    } catch (err) {
      logger.error(`Debate synthesis failed: ${err}`);
      return null;
    }
  }
}
