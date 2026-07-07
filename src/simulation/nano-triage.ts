import type { Agent, TriageResult, EpochDigest } from '../types/index.js';
import type { LLMProvider } from '../llm/provider.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

export class NanoTriage {
  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  buildEpochDigest(
    newDiscoveries: string[],
    newHypotheses: string[],
    agentStatusChanges: string[],
    notableEvents: string[],
    openTeamCalls: Array<{ hypothesisId: string; title: string; requiredExpertise: string[] }>,
  ): EpochDigest {
    return {
      newDiscoveries,
      newHypotheses,
      agentStatusChanges,
      notableEvents,
      openTeamCalls,
    };
  }

  async evaluateAgent(
    agent: Agent,
    epochDigest: EpochDigest,
  ): Promise<TriageResult> {
    const openCallsText = epochDigest.openTeamCalls.length > 0
      ? epochDigest.openTeamCalls.map(
          (c) => `- [${c.hypothesisId}] ${c.title} (needs: ${c.requiredExpertise.join(', ')})`,
        ).join('\n')
      : '(none)';

    const digestText = [
      ...epochDigest.newDiscoveries.map((d) => `Discovery: ${d}`),
      ...epochDigest.newHypotheses.map((h) => `Hypothesis: ${h}`),
      ...epochDigest.notableEvents,
    ].join('\n') || '(nothing notable)';

    const prompt = this.prompts.buildNanoTriage({
      agentName: agent.name,
      archetype: agent.archetype,
      expertiseShort: agent.expertise.join(', '),
      personalityTraitsCsv: agent.personalityTraits.join(', '),
      status: agent.status,
      epochDigest: digestText,
      openTeamCalls: openCallsText,
    });

    try {
      const result = await this.llm.generateJSON<TriageResult>(prompt, {
        temperature: 0.3,
        maxTokens: 200,
        tier: 'small',
      });
      logger.debug(
        `Nano triage for ${agent.name}: wantsToAct=${result.wantsToAct}, action=${result.actionType}, urgency=${result.urgency}`,
      );
      return result;
    } catch (err) {
      logger.error(`Nano triage failed for ${agent.name}: ${err}`);
      return {
        wantsToAct: false,
        actionType: 'none',
        reason: 'Triage LLM call failed',
        urgency: 'low',
      };
    }
  }
}
