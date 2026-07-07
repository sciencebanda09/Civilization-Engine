import type { LLMProvider } from '../llm/provider.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

export interface CausalExplanationResult {
  answer: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

export class CausalOracle {
  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  async answer(
    question: string,
    causalGraphContext: string,
    conversationHistory: string,
  ): Promise<CausalExplanationResult> {
    const prompt = this.prompts.buildCausalExplanation({
      retrievedCausalSubgraph: causalGraphContext,
      judgeQuestion: question,
      liveSessionTranscript: conversationHistory,
    });

    try {
      const result = await this.llm.generate(prompt, {
        temperature: 0.5,
        maxTokens: 500,
        tier: 'big',
      });

      const cleaned = result.trim();
      const needsClarification =
        cleaned.includes('?') &&
        (cleaned.toLowerCase().includes('clarify') ||
         cleaned.toLowerCase().includes('which') ||
         cleaned.toLowerCase().includes('what do you mean') ||
         cleaned.length < 100);

      return {
        answer: needsClarification ? cleaned : cleaned,
        needsClarification,
        clarificationQuestion: needsClarification ? cleaned : undefined,
      };
    } catch (err) {
      logger.error(`Causal explanation failed: ${err}`);
      return {
        answer: "I'm sorry, I cannot answer that question right now.",
        needsClarification: false,
      };
    }
  }
}
