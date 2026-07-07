import type { Agent, Hypothesis, TeamFormationResult } from '../types/index.js';
import type { LLMProvider } from '../llm/provider.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

export class TeamFormation {
  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  private expertiseMatches(agent: Agent, required: string[]): boolean {
    if (required.length === 0) return true;
    return required.some((req) =>
      agent.expertise.some((exp) => {
        const reqWords = req.toLowerCase().split(/[\s_]+/);
        const expWords = exp.toLowerCase().split(/[\s_]+/);
        return reqWords.some((w) => expWords.includes(w)) || expWords.some((w) => reqWords.includes(w));
      }),
    );
  }

  findCandidateAgents(hypothesis: Hypothesis, allAgents: Agent[], proposerId: string): Agent[] {
    return allAgents.filter((agent) => {
      const matchesExpertise = this.expertiseMatches(agent, hypothesis.requiredExpertise);
      const isProposer = agent.id === proposerId;
      const isAvailable = isProposer || agent.status === 'idle';
      return matchesExpertise && isAvailable;
    });
  }

  async formTeam(
    hypothesis: Hypothesis,
    candidateAgents: Agent[],
  ): Promise<TeamFormationResult | null> {
    if (candidateAgents.length === 0) {
      logger.info(`No candidates for hypothesis "${hypothesis.title}"`);
      return {
        teamFormed: false,
        selectedAgentIds: [],
        teamRationale: 'No available agents with matching expertise',
        excludedNotableCandidates: [],
      };
    }

    const candidateShortlist = candidateAgents
      .map(
        (a) =>
          `${a.id} | ${a.name} | expertise: ${a.expertise.join(', ')} | personality: ${a.personalityTraits.join(', ')} | relationship: ${a.relationshipSummary}`,
      )
      .join('\n');

    const prompt = this.prompts.buildTeamRecruitment({
      hypothesisJson: JSON.stringify(hypothesis),
      candidateShortlist,
    });

    try {
      const result = await this.llm.generateJSON<{
        teamFormed: boolean;
        selectedAgentIds: string[];
        teamRationale: string;
        excludedNotableCandidates: Array<{ agentId: string; reason: string }>;
      }>(prompt, {
        temperature: 0.3,
        maxTokens: 400,
        tier: 'big',
      });

      logger.info(
        `Team formation for "${hypothesis.title}": formed=${result.teamFormed}, members=${result.selectedAgentIds.length}`,
      );

      return {
        teamFormed: result.teamFormed,
        selectedAgentIds: result.selectedAgentIds,
        teamRationale: result.teamRationale,
        excludedNotableCandidates: result.excludedNotableCandidates,
      };
    } catch (err) {
      logger.error(`Team formation failed for "${hypothesis.title}": ${err}`);
      return null;
    }
  }
}
