import type { Agent } from './agent.js';

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  rationale: string;
  requiredExpertise: string[];
  estimatedDifficulty: 'low' | 'medium' | 'high';
  resourcesNeeded: string[];
  proposerId: string;
  status: HypothesisStatus;
  createdAt: number;
}

export type HypothesisStatus = 'proposed' | 'team_forming' | 'in_debate' | 'ready_for_adjudication' | 'resolved' | 'stalled';

export type Difficulty = 'low' | 'medium' | 'high';

export interface TriageResult {
  wantsToAct: boolean;
  actionType: 'propose_hypothesis' | 'join_team' | 'respond_to_message' | 'pursue_goal' | 'none';
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface TeamFormationResult {
  teamFormed: boolean;
  selectedAgentIds: string[];
  teamRationale: string;
  excludedNotableCandidates: Array<{ agentId: string; reason: string }>;
}

export interface DebateTurn {
  agentId: string;
  dialogue: string;
  stance: 'support' | 'object' | 'propose_modification' | 'neutral';
  modificationProposed: string | null;
  finalConfidence: number | null;
  turnNumber: number;
}

export interface ExperimentDesign {
  finalHypothesis: string;
  experimentDesign: string;
  teamConfidence: number;
  identifiedRisks: string[];
  resourcesCommitted: string[];
}

export type OutcomeType = 'success' | 'partial' | 'failure';

export interface ExperimentOutcome {
  outcome: OutcomeType;
  narrative: string;
  discovery: {
    title: string | null;
    description: string | null;
    worldStateDelta: Record<string, string>;
    enabledFutureDomains: string[];
  } | null;
  lessonLearned: string;
  agentMemoryNotes: Array<{
    agentId: string;
    memorySummary: string;
  }>;
}

export interface AgentTeam {
  id: string;
  hypothesisId: string;
  memberIds: string[];
  members: Agent[];
  turns: DebateTurn[];
  experimentDesign: ExperimentDesign | null;
  outcome: ExperimentOutcome | null;
}
