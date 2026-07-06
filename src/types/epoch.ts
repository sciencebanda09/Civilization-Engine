import type { Hypothesis, TeamFormationResult } from './experiment.js';
import type { TriageResult } from './experiment.js';

export interface EpochDigest {
  newDiscoveries: string[];
  newHypotheses: string[];
  agentStatusChanges: string[];
  notableEvents: string[];
  openTeamCalls: Array<{ hypothesisId: string; title: string; requiredExpertise: string[] }>;
}

export interface EpochTimelineEntry {
  epochTitle: string | null;
  summary: string;
  notableDiscoveries: string[];
  notableFailures: string[];
  populationNote: string | null;
}

export interface OrchestratorMetaResult {
  isHealthy: boolean;
  issueType: 'stagnation' | 'repetition' | 'runaway_success' | 'none';
  likelyCause: string;
  suggestedParameterChange: string;
}

export interface CausalExplanationRequest {
  question: string;
  relevantSubgraph: string;
  conversationHistory: string;
}

export interface CounterfactualInjection {
  injectionConfirmed: boolean;
  policyOrEvent: string;
  injectionEpoch: number;
  scope: 'global' | 'specific_agents' | 'specific_resource';
  affectedTargets: string[];
  clarifyingQuestion?: string;
}

export interface CounterfactualProjection {
  divergedAtEpoch: number;
  divergenceSummary: string;
  projectedEpochs: Array<{
    epoch: number;
    whatChangesVsOriginal: string;
    newOrBlockedDiscoveries: string[];
    notableAgentReactions: Array<{ agentId: string; reaction: string }>;
  }>;
  endStateComparison: string;
}

export interface EpochEvent {
  type: 'hypothesis_proposed' | 'team_formed' | 'debate_completed' | 'experiment_resolved' | 'agent_idle' | 'narrative';
  agentIds: string[];
  description: string;
  hypothesisId?: string;
  teamId?: string;
  outcome?: string;
}
