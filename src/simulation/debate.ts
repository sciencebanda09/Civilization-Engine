import type { Agent, Hypothesis, DebateTurn } from '../types/index.js';
import type { LLMProvider } from '../llm/provider.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

export class DebateSystem {
  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  async runDebate(
    hypothesis: Hypothesis,
    teamMembers: Agent[],
    maxTurns: number,
  ): Promise<DebateTurn[]> {
    const turns: DebateTurn[] = [];
    const teamRoster = teamMembers
      .map((m) => `${m.name} (${m.archetype}, expertise: ${m.expertise.join(', ')})`)
      .join('\n');

    for (let turn = 1; turn <= maxTurns; turn++) {
      for (const member of teamMembers) {
        const isFinal = turn === maxTurns;

        const personaPrompt = this.prompts.buildAgentBasePersona({
          agentName: member.name,
          archetype: member.archetype,
          personalityTraitsCsv: member.personalityTraits.join(', '),
          expertiseDescription: member.expertiseDescription,
          goalsList: member.goals.join('; '),
          relationshipSummary: member.relationshipSummary,
          memoryDigest: member.memoryDigest,
          worldStateSummary: '(available in hypothesis context)',
        });

        const transcript = turns
          .map(
            (t) =>
              `[Turn ${t.turnNumber}] ${t.agentId}: "${t.dialogue}" (${t.stance})`,
          )
          .join('\n');

        const prompt = this.prompts.buildDebateTurn({
          agentBasePersona: personaPrompt,
          turnNumber: String(turn),
          maxTurns: String(maxTurns),
          hypothesisJson: JSON.stringify(hypothesis),
          teamRoster,
          debateTranscript: transcript || '(no discussion yet)',
        });

        try {
          const result = await this.llm.generateJSON<{
            dialogue: string;
            stance: 'support' | 'object' | 'propose_modification' | 'neutral';
            modificationProposed: string | null;
            finalConfidence: number | null;
          }>(prompt, {
            temperature: 0.7,
            maxTokens: 300,
          });

          const turnRecord: DebateTurn = {
            agentId: member.id,
            dialogue: result.dialogue,
            stance: result.stance,
            modificationProposed: result.modificationProposed ?? null,
            finalConfidence: isFinal ? (result.finalConfidence ?? null) : null,
            turnNumber: turn,
          };

          turns.push(turnRecord);
          logger.debug(
            `Debate turn ${turn} for ${member.name}: ${result.stance}`,
          );
        } catch (err) {
          logger.error(`Debate turn failed for ${member.name}: ${err}`);
          turns.push({
            agentId: member.id,
            dialogue: '(unable to respond)',
            stance: 'neutral',
            modificationProposed: null,
            finalConfidence: isFinal ? 0.5 : null,
            turnNumber: turn,
          });
        }
      }
    }

    logger.info(
      `Debate completed for hypothesis "${hypothesis.title}" with ${turns.length} total turns across ${teamMembers.length} members`,
    );
    return turns;
  }
}
