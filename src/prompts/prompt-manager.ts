import { PROMPTS } from './templates.js';

export class PromptManager {
  interpolate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(pattern, value);
    }
    return result;
  }

  buildAgentBasePersona(vars: {
    agentName: string;
    archetype: string;
    personalityTraitsCsv: string;
    expertiseDescription: string;
    goalsList: string;
    relationshipSummary: string;
    memoryDigest: string;
    worldStateSummary: string;
  }): string {
    return this.interpolate(PROMPTS.agentBasePersona, vars);
  }

  buildNanoTriage(vars: {
    agentName: string;
    archetype: string;
    expertiseShort: string;
    personalityTraitsCsv: string;
    status: string;
    epochDigest: string;
    openTeamCalls: string;
  }): string {
    return this.interpolate(PROMPTS.nanoTriage, vars);
  }

  buildHypothesisGeneration(vars: {
    agentBasePersona: string;
    worldStateSummary: string;
    memoryDigest: string;
  }): string {
    return this.interpolate(PROMPTS.hypothesisGeneration, vars);
  }

  buildTeamRecruitment(vars: {
    hypothesisJson: string;
    candidateShortlist: string;
  }): string {
    return this.interpolate(PROMPTS.teamRecruitment, vars);
  }

  buildDebateTurn(vars: {
    agentBasePersona: string;
    turnNumber: string;
    maxTurns: string;
    hypothesisJson: string;
    teamRoster: string;
    debateTranscript: string;
  }): string {
    return this.interpolate(PROMPTS.debateTurn, vars);
  }

  buildDebateSynthesis(vars: {
    debateTranscript: string;
  }): string {
    return this.interpolate(PROMPTS.debateSynthesis, vars);
  }

  buildExperimentAdjudication(vars: {
    experimentDesignJson: string;
    teamRoster: string;
    worldStateSummary: string;
  }): string {
    return this.interpolate(PROMPTS.experimentAdjudication, vars);
  }

  buildMemorySummarization(vars: {
    agentName: string;
    archetype: string;
    eventJson: string;
  }): string {
    return this.interpolate(PROMPTS.memorySummarization, vars);
  }

  buildEpochNarration(vars: {
    epochNumber: string;
    eraName: string;
    epochEventsJson: string;
    worldStateSummary: string;
  }): string {
    return this.interpolate(PROMPTS.epochNarration, vars);
  }

  buildCausalExplanation(vars: {
    retrievedCausalSubgraph: string;
    judgeQuestion: string;
    liveSessionTranscript: string;
  }): string {
    return this.interpolate(PROMPTS.causalExplanation, vars);
  }

  buildCounterfactualIntake(vars: {
    judgeRequest: string;
    worldStateAtEpoch: string;
  }): string {
    return this.interpolate(PROMPTS.counterfactualIntake, vars);
  }

  buildCounterfactualProjection(vars: {
    confirmedInjectionJson: string;
    originalTimelineSegment: string;
    worldStateAtEpoch: string;
  }): string {
    return this.interpolate(PROMPTS.counterfactualProjection, vars);
  }

  buildCounterfactualNarration(vars: {
    fastForwardResultJson: string;
    judgeRequest: string;
  }): string {
    return this.interpolate(PROMPTS.counterfactualNarration, vars);
  }

  buildOrchestratorMeta(vars: {
    recentEpochsLog: string;
  }): string {
    return this.interpolate(PROMPTS.orchestratorMeta, vars);
  }
}
