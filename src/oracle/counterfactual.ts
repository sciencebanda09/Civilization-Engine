import type { WorldState, CounterfactualInjection, CounterfactualProjection } from '../types/index.js';
import type { LLMProvider } from '../llm/provider.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

export class CounterfactualEngine {
  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  async processInjection(
    judgeRequest: string,
    worldStateAtEpoch: WorldState,
  ): Promise<CounterfactualInjection> {
    const prompt = this.prompts.buildCounterfactualIntake({
      judgeRequest,
      worldStateAtEpoch: JSON.stringify(worldStateAtEpoch),
    });

    try {
      const raw = await this.llm.generate(prompt, { temperature: 0.3, maxTokens: 300, tier: 'big' });
      const cleaned = raw.trim();

      if (cleaned.includes('injection_confirmed')) {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            injectionConfirmed: parsed.injection_confirmed ?? true,
            policyOrEvent: parsed.policy_or_event ?? judgeRequest,
            injectionEpoch: parsed.injection_epoch ?? worldStateAtEpoch.epoch,
            scope: parsed.scope ?? 'global',
            affectedTargets: parsed.affected_targets ?? [],
          };
        }
      }

      return {
        injectionConfirmed: false,
        policyOrEvent: '',
        injectionEpoch: worldStateAtEpoch.epoch,
        scope: 'global',
        affectedTargets: [],
        clarifyingQuestion: cleaned,
      };
    } catch (err) {
      logger.error(`Counterfactual intake failed: ${err}`);
      return {
        injectionConfirmed: false,
        policyOrEvent: judgeRequest,
        injectionEpoch: worldStateAtEpoch.epoch,
        scope: 'global',
        affectedTargets: [],
        clarifyingQuestion: 'Could you clarify what exactly should change and at which epoch?',
      };
    }
  }

  async project(
    injection: CounterfactualInjection,
    originalTimeline: string,
    worldStateAtEpoch: WorldState,
  ): Promise<CounterfactualProjection | null> {
    if (!injection.injectionConfirmed) return null;

    const prompt = this.prompts.buildCounterfactualProjection({
      confirmedInjectionJson: JSON.stringify(injection),
      originalTimelineSegment: originalTimeline,
      worldStateAtEpoch: JSON.stringify(worldStateAtEpoch),
    });

    try {
      const result = await this.llm.generateJSON<{
        divergedAtEpoch: number;
        divergenceSummary: string;
        projectedEpochs: Array<{
          epoch: number;
          whatChangesVsOriginal: string;
          newOrBlockedDiscoveries: string[];
          notableAgentReactions: Array<{ agentId: string; reaction: string }>;
        }>;
        endStateComparison: string;
      }>(prompt, { temperature: 0.4, maxTokens: 800, tier: 'big' });

      return {
        divergedAtEpoch: result.divergedAtEpoch,
        divergenceSummary: result.divergenceSummary,
        projectedEpochs: result.projectedEpochs.map((e: { epoch: number; whatChangesVsOriginal: string; newOrBlockedDiscoveries: string[]; notableAgentReactions: Array<{ agentId: string; reaction: string }> }) => ({
          epoch: e.epoch,
          whatChangesVsOriginal: e.whatChangesVsOriginal,
          newOrBlockedDiscoveries: e.newOrBlockedDiscoveries,
          notableAgentReactions: e.notableAgentReactions,
        })),
        endStateComparison: result.endStateComparison,
      };
    } catch (err) {
      logger.error(`Counterfactual projection failed: ${err}`);
      return null;
    }
  }

  async narrate(
    projection: CounterfactualProjection,
    originalRequest: string,
  ): Promise<string> {
    const prompt = this.prompts.buildCounterfactualNarration({
      fastForwardResultJson: JSON.stringify(projection),
      judgeRequest: originalRequest,
    });

    try {
      return await this.llm.generate(prompt, {
        temperature: 0.6,
        maxTokens: 400,
        tier: 'big',
      });
    } catch (err) {
      logger.error(`Counterfactual narration failed: ${err}`);
      return 'The counterfactual simulation completed, but narration is unavailable.';
    }
  }
}
