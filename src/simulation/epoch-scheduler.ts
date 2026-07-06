import type { Agent, WorldState, EpochDigest, EpochEvent } from '../types/index.js';
import type { AgentTeam } from '../types/experiment.js';
import { logger } from '../utils/logger.js';

export interface EpochResult {
  epoch: number;
  events: EpochEvent[];
  activeAgentIds: string[];
  newHypothesisIds: string[];
  resolvedTeamIds: string[];
  worldState: WorldState;
}

export class EpochScheduler {
  private static readonly ERAS = [
    { name: 'Stone Age', startEpoch: 0 },
    { name: 'Bronze Age', startEpoch: 20 },
    { name: 'Iron Age', startEpoch: 40 },
    { name: 'Classical Era', startEpoch: 60 },
    { name: 'Medieval Era', startEpoch: 80 },
    { name: 'Renaissance', startEpoch: 100 },
  ];

  getEraName(epoch: number): string {
    let era = EpochScheduler.ERAS[0]!.name;
    for (const e of EpochScheduler.ERAS) {
      if (epoch >= e.startEpoch) era = e.name;
    }
    return era;
  }

  buildEpochDigest(
    currentEpoch: number,
    previousEvents: EpochEvent[],
    activeTeams: AgentTeam[],
    worldState: WorldState,
  ): EpochDigest {
    const newDiscoveries = previousEvents
      .filter((e) => e.type === 'experiment_resolved' && e.outcome === 'success')
      .map((e) => e.description);

    const newHypotheses = previousEvents
      .filter((e) => e.type === 'hypothesis_proposed')
      .map((e) => e.description);

    return {
      newDiscoveries,
      newHypotheses,
      agentStatusChanges: previousEvents
        .filter((e) => e.type === 'agent_idle')
        .map((e) => e.description),
      notableEvents: previousEvents
        .filter((e) => e.type === 'narrative')
        .map((e) => e.description),
      openTeamCalls: activeTeams
        .filter((t) => !t.outcome)
        .map((t) => ({
          hypothesisId: t.hypothesisId,
          title: `Team ${t.id}`,
          requiredExpertise: t.members.flatMap((m) => m.expertise),
        })),
    };
  }

  selectAgentsForEpoch(allAgents: Agent[], maxActive: number): Agent[] {
    const idle = allAgents.filter((a) => a.status === 'idle');
    const shuffled = [...idle].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxActive);
  }
}
