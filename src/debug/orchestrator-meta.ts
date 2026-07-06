import type { LLMProvider } from '../llm/provider.js';
import type { OrchestratorMetaResult } from '../types/index.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

export class OrchestratorMetaDebugger {
  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  async diagnose(recentEpochsLog: string): Promise<OrchestratorMetaResult> {
    const prompt = this.prompts.buildOrchestratorMeta({
      recentEpochsLog,
    });

    try {
      const result = await this.llm.generateJSON<{
        isHealthy: boolean;
        issueType: 'stagnation' | 'repetition' | 'runaway_success' | 'none';
        likelyCause: string;
        suggestedParameterChange: string;
      }>(prompt, {
        temperature: 0.3,
        maxTokens: 300,
      });

      logger.info(
        `Orchestrator meta: healthy=${result.isHealthy}, issue=${result.issueType}`,
      );

      return {
        isHealthy: result.isHealthy,
        issueType: result.issueType,
        likelyCause: result.likelyCause,
        suggestedParameterChange: result.suggestedParameterChange,
      };
    } catch (err) {
      logger.error(`Orchestrator meta diagnosis failed: ${err}`);
      return {
        isHealthy: true,
        issueType: 'none',
        likelyCause: 'Diagnosis call failed',
        suggestedParameterChange: 'Retry or check LLM connectivity',
      };
    }
  }
}
