import type { Agent, WorldState, EpochEvent } from '../types/index.js';
import type { AgentTeam, Hypothesis, TeamFormationResult } from '../types/experiment.js';
import type { Config } from '../config.js';
import type { LLMProvider, LLMOptions } from '../llm/provider.js';
import { AgentManager } from '../agents/agent-manager.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { NanoTriage } from './nano-triage.js';
import { HypothesisEngine } from './hypothesis-engine.js';
import { TeamFormation } from './team-formation.js';
import { DebateSystem } from './debate.js';
import { DebateSynthesis } from './debate-synthesis.js';
import { WorldSimulator } from './world-simulator.js';
import { TimelineService } from './timeline.js';
import { EpochScheduler, EpochResult } from './epoch-scheduler.js';
import { logger } from '../utils/logger.js';
import { EventBus, EventHistory } from '../events/event-bus.js';
import { HistoryTracker } from './history-tracker.js';
import { EconomyEngine, DEFAULT_ECONOMY, EconomyResult } from './economy.js';
import { CatastropheEngine, DEFAULT_CATASTROPHE_CONFIG, CatastropheEvent } from './catastrophes.js';
import { RelationshipManager, DEFAULT_RELATIONSHIP_CONFIG } from './relationships.js';
import { EraManager, DEFAULT_ERAS } from './eras.js';

class CountingLLMProvider implements LLMProvider {
  public count = 0;
  constructor(private inner: LLMProvider) {}
  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    this.count++;
    return this.inner.generate(prompt, options);
  }
  async generateJSON<T>(prompt: string, options?: LLMOptions): Promise<T> {
    this.count++;
    return this.inner.generateJSON<T>(prompt, options);
  }
}

export class Orchestrator {
  private config: Config;
  private agents: AgentManager;
  private prompts: PromptManager;
  private triage: NanoTriage;
  private hypotheses: HypothesisEngine;
  private teamFormation: TeamFormation;
  private debate: DebateSystem;
  private debateSynthesis: DebateSynthesis;
  private worldSim: WorldSimulator;
  private timeline: TimelineService;
  private epochScheduler: EpochScheduler;
  private llm: LLMProvider;
  private countedLlm: CountingLLMProvider;
  private eventBus: EventBus;
  private eventHistory: EventHistory;
  private historyTracker: HistoryTracker;
  private economy: EconomyEngine;
  private catastrophes: CatastropheEngine;
  private relationships: RelationshipManager;
  private eraManager: EraManager;
  private populationEstimate: number;
  private catastropheCooldown: number;
  private lastCatastropheEpoch: number;

  private worldState: WorldState;
  private activeTeams: Map<string, AgentTeam> = new Map();
  private epochEvents: EpochEvent[] = [];
  private currentEpoch = 0;
  private running = false;

  constructor(
    config: Config,
    llm: LLMProvider,
    agentManager: AgentManager,
    initialWorldState: WorldState,
  ) {
    this.config = config;
    this.countedLlm = new CountingLLMProvider(llm);
    this.llm = this.countedLlm;
    this.agents = agentManager;
    this.worldState = initialWorldState;
    this.prompts = new PromptManager();
    this.triage = new NanoTriage(this.llm, this.prompts);
    this.hypotheses = new HypothesisEngine(this.llm, this.prompts);
    this.teamFormation = new TeamFormation(this.llm, this.prompts);
    this.debate = new DebateSystem(this.llm, this.prompts);
    this.debateSynthesis = new DebateSynthesis(this.llm, this.prompts);
    this.worldSim = new WorldSimulator(this.llm, this.prompts);
    this.timeline = new TimelineService(this.llm, this.prompts);
    this.epochScheduler = new EpochScheduler();
    this.eventBus = new EventBus();
    this.eventHistory = new EventHistory();
    this.historyTracker = new HistoryTracker();
    this.economy = new EconomyEngine(DEFAULT_ECONOMY);
    this.catastrophes = new CatastropheEngine(DEFAULT_CATASTROPHE_CONFIG);
    this.relationships = new RelationshipManager(DEFAULT_RELATIONSHIP_CONFIG);
    this.eraManager = new EraManager(DEFAULT_ERAS);
    this.populationEstimate = 50;
    this.lastCatastropheEpoch = -10;
    this.catastropheCooldown = 3;
  }

  async runEpoch(): Promise<EpochResult> {
    this.currentEpoch++;
    const epoch = this.currentEpoch;
    this.epochEvents = [];
    this.worldState.epoch = epoch;
    if (!this.worldState.enabledDomains) this.worldState.enabledDomains = [];
    const era = this.epochScheduler.getEraName(epoch);

    logger.info(`=== Epoch ${epoch} (${era}) ===`);

    const discoveredDomains = this.worldState.discoveries?.filter(d => d?.title).map(d => d.title.toLowerCase()) ?? [];
    const econResult = this.economy.processEpoch(this.worldState, this.populationEstimate, discoveredDomains);

    for (const [resource, delta] of Object.entries(econResult.deltas)) {
      this.worldState.resources[resource] = (this.worldState.resources[resource] ?? 0) + delta;
      if (this.worldState.resources[resource] < 0) this.worldState.resources[resource] = 0;
    }

    if (econResult.starvation) {
      this.populationEstimate = Math.max(10, this.populationEstimate - Math.floor(Math.random() * 5) - 1);
      this.epochEvents.push({ type: 'narrative', agentIds: [], description: `🌾 Starvation strikes! Population declines to ${this.populationEstimate}.` });
    } else if (econResult.surplus) {
      this.populationEstimate += Math.floor(Math.random() * 3) + 1;
      if (this.populationEstimate % 20 === 0) {
        this.epochEvents.push({ type: 'narrative', agentIds: [], description: `📈 Population reaches ${this.populationEstimate}!` });
      }
    }
    this.worldState.populationNote = `~${this.populationEstimate} people`;

    const eraTransition = this.eraManager.checkTransition(epoch, discoveredDomains);
    if (eraTransition.triggered && eraTransition.to) {
      this.worldState.era = eraTransition.to.name;
      const existing = this.worldState.enabledDomains ?? [];
      this.worldState.enabledDomains = [...new Set([...existing, ...eraTransition.to.enabledDomains])];
      this.epochEvents.push({ type: 'narrative', agentIds: [], description: `🏛️ ERA PROGRESSION: ${eraTransition.to.name} unlocked! ${eraTransition.to.description}` });
      this.eventBus.emit({ type: 'era_transition', from: eraTransition.from?.name ?? 'unknown', to: eraTransition.to.name, epoch });
    }

    const catastrophe = this.catastrophes.checkForEvent(epoch, this.worldState, discoveredDomains);
    if (catastrophe) {
      this.lastCatastropheEpoch = epoch;
      for (const [res, delta] of Object.entries(catastrophe.resourceDeltas)) {
        this.worldState.resources[res] = (this.worldState.resources[res] ?? 0) + delta;
        if (this.worldState.resources[res] < 0) this.worldState.resources[res] = 0;
      }
      if (catastrophe.populationLoss > 0) {
        this.populationEstimate = Math.max(5, this.populationEstimate - catastrophe.populationLoss);
      }
      this.epochEvents.push({ type: 'narrative', agentIds: [], description: `💀 CATASTROPHE: ${catastrophe.description}` });
      this.eventBus.emit({ type: 'catastrophe', description: catastrophe.description, severity: catastrophe.severity });
    }

    this.relationships.decayAll(this.agents.getAllAgents().map(a => a.id));

    const activeAgents = this.epochScheduler.selectAgentsForEpoch(
      this.agents.getAllAgents(),
      this.config.simulation.agentsPerEpochActive,
    );

    const activeAgentIds: string[] = [];

    for (const agent of activeAgents) {
      const digest = this.epochScheduler.buildEpochDigest(
        epoch,
        this.epochEvents,
        Array.from(this.activeTeams.values()),
        this.worldState,
      );

      const triageResult = await this.triage.evaluateAgent(agent, digest);

      if (!triageResult.wantsToAct) continue;
      activeAgentIds.push(agent.id);

      switch (triageResult.actionType) {
        case 'propose_hypothesis':
        case 'pursue_goal': {
          this.agents.setStatus(agent.id, 'busy');
          this.eventBus.emit({ type: 'agent_status_change', agentId: agent.id, oldStatus: 'idle', newStatus: 'busy' });
          const hypothesis = await this.hypotheses.generateHypothesis(agent, this.worldState);
          if (hypothesis) {
            this.epochEvents.push({
              type: 'hypothesis_proposed',
              agentIds: [agent.id],
              description: `${agent.name} proposed: "${hypothesis.title}"`,
              hypothesisId: hypothesis.id,
            });
            this.eventBus.emit({ type: 'hypothesis_proposed', hypothesisId: hypothesis.id, title: hypothesis.title, proposerId: agent.id });
          }
          this.agents.setStatus(agent.id, 'idle');
          this.eventBus.emit({ type: 'agent_status_change', agentId: agent.id, oldStatus: 'busy', newStatus: 'idle' });
          break;
        }
        case 'respond_to_message':
        case 'join_team': {
          const openHypes = this.hypotheses.getOpenHypotheses();
          if (openHypes.length > 0) {
            const target = openHypes[0]!;
            this.agents.setStatus(agent.id, 'busy');
            this.eventBus.emit({ type: 'agent_status_change', agentId: agent.id, oldStatus: 'idle', newStatus: 'busy' });
            await this.formTeamForHypothesis(target);
          }
          break;
        }
        default:
          break;
      }
    }

    this.countedLlm.count = 0;

    const newHypothesisIds = this.hypotheses
      .getHypothesesByStatus('proposed')
      .map((h) => h.id);

    const maxTeams = this.config.simulation.maxActiveTeamsPerEpoch;
    let teamsFormedThisEpoch = 0;
    for (const hypId of newHypothesisIds) {
      if (teamsFormedThisEpoch >= maxTeams) {
        logger.info(`[Cap] Max active teams (${maxTeams}) reached this epoch, deferring hypothesis ${hypId}`);
        break;
      }
      const formed = await this.processHypothesis(hypId);
      if (formed) teamsFormedThisEpoch++;
    }

    const resolvedTeamIds: string[] = [];
    for (const [teamId, team] of this.activeTeams) {
      if (team.outcome) continue;
      const resolved = await this.processTeam(team);
      if (resolved) resolvedTeamIds.push(teamId);
    }

    this.historyTracker.recordSnapshot({
      epoch,
      era: this.worldState.era,
      worldState: {
        era: this.worldState.era,
        epoch,
        resources: { ...this.worldState.resources },
        discoveries: this.worldState.discoveries.map(d => ({ title: d.title, description: d.description, epochDiscovered: d.epochDiscovered })),
        enabledDomains: [...this.worldState.enabledDomains],
        populationNote: this.worldState.populationNote,
      },
      agents: this.agents.getAllAgents().map(a => ({
        id: a.id,
        name: a.name,
        archetype: a.archetype,
        expertise: [...a.expertise],
        status: a.status,
        memoryCount: a.memories.length,
        relationships: this.relationships.getAgentRelationships(a.id),
      })),
      activeHypotheses: this.hypotheses.getAllHypotheses().map(h => ({
        id: h.id,
        title: h.title,
        proposerId: h.proposerId,
        status: h.status,
        difficulty: h.estimatedDifficulty,
      })),
      activeTeams: Array.from(this.activeTeams.values()).map(t => ({
        id: t.id,
        hypothesisTitle: this.hypotheses.getHypothesis(t.hypothesisId)?.title ?? 'unknown',
        memberIds: [...t.memberIds],
        turnCount: t.turns.length,
        outcome: t.outcome?.outcome ?? null,
      })),
      events: this.epochEvents.map(e => e.description),
    });

    this.eventBus.emit({ type: 'epoch_end', epoch, events: this.epochEvents.length });

    const timelineEntry = await this.timeline.recordEpoch(
      epoch,
      era,
      this.epochEvents,
      this.worldState,
    );

    if (timelineEntry.epochTitle) {
      logger.info(`>>> ${timelineEntry.epochTitle}: ${timelineEntry.summary}`);
    }

    return {
      epoch,
      events: this.epochEvents,
      activeAgentIds,
      newHypothesisIds,
      resolvedTeamIds,
      worldState: { ...this.worldState },
    };
  }

  async run(maxEpochs?: number): Promise<void> {
    this.running = true;
    const limit = maxEpochs ?? this.config.simulation.maxEpochs;
    for (let i = 0; i < limit && this.running; i++) {
      await this.runEpoch();

      if (this.config.debug.checkIntervalEpochs > 0 &&
          (this.currentEpoch % this.config.debug.checkIntervalEpochs === 0)) {
        const stats = {
          totalAgents: this.agents.count(),
          idleAgents: this.agents.getAgentsByStatus('idle').length,
          totalHypotheses: this.hypotheses.getAllHypotheses().length,
          openHypotheses: this.hypotheses.getOpenHypotheses().length,
          activeTeams: this.activeTeams.size,
          discoveries: this.worldState.discoveries.length,
          llmCalls: this.countedLlm.count,
        };
        logger.info(`[Health] Epoch ${this.currentEpoch}: ${JSON.stringify(stats)}`);
      }
    }
    logger.info(`Simulation finished after ${this.currentEpoch} epochs`);
  }

  stop(): void {
    this.running = false;
  }

  private async formTeamForHypothesis(hypothesis: Hypothesis): Promise<void> {
    const allAgents = this.agents.getAllAgents();
    const candidates = this.teamFormation.findCandidateAgents(hypothesis, allAgents, hypothesis.proposerId);
    const result = await this.teamFormation.formTeam(hypothesis, candidates);

    if (!result?.teamFormed || result.selectedAgentIds.length === 0) return;

    const proposer = this.agents.getAgent(hypothesis.proposerId);
    const members = this.agents.getAgentsByIds(result.selectedAgentIds);
    if (proposer && !members.find((m) => m.id === proposer.id)) {
      members.unshift(proposer);
    }

    const team: AgentTeam = {
      id: `team_${hypothesis.id}`,
      hypothesisId: hypothesis.id,
      memberIds: members.map((m) => m.id),
      members,
      turns: [],
      experimentDesign: null,
      outcome: null,
    };

    this.activeTeams.set(team.id, team);
    this.hypotheses.setStatus(hypothesis.id, 'team_forming');

    for (const member of members) {
      this.agents.setStatus(member.id, 'in_debate');
    }

    this.epochEvents.push({
      type: 'team_formed',
      agentIds: members.map((m) => m.id),
      description: `Team formed for "${hypothesis.title}" with ${members.length} members`,
      hypothesisId: hypothesis.id,
      teamId: team.id,
    });

    this.eventBus.emit({ type: 'team_formed', teamId: team.id, hypothesisId: hypothesis.id, memberIds: members.map(m => m.id) });

    logger.info(`Team ${team.id} formed for "${hypothesis.title}"`);
  }

  private async processHypothesis(hypId: string): Promise<boolean> {
    const hypothesis = this.hypotheses.getHypothesis(hypId);
    if (!hypothesis || hypothesis.status !== 'proposed') return false;

    this.hypotheses.setStatus(hypId, 'team_forming');
    const prevSize = this.activeTeams.size;
    await this.formTeamForHypothesis(hypothesis);
    return this.activeTeams.size > prevSize;
  }

  private async processTeam(team: AgentTeam): Promise<boolean> {
    const hypothesis = this.hypotheses.getHypothesis(team.hypothesisId);
    if (!hypothesis) {
      this.activeTeams.delete(team.id);
      return true;
    }

    this.hypotheses.setStatus(hypothesis.id, 'in_debate');

    const turns = await this.debate.runDebate(
      hypothesis,
      team.members,
      this.config.simulation.debateMaxTurns,
    );
    team.turns = turns;

    const design = await this.debateSynthesis.synthesize(turns, team.members);
    if (!design) {
      logger.warn(`Debate synthesis failed for team ${team.id}, stalling`);
      this.hypotheses.setStatus(hypothesis.id, 'stalled');
      this.releaseTeamMembers(team);
      return true;
    }
    team.experimentDesign = design;

    const outcome = await this.worldSim.adjudicate(
      design,
      team.members,
      this.worldState,
    );

    if (outcome) {
      team.outcome = outcome;
      this.worldState = this.worldSim.applyOutcomeToWorld(this.worldState, outcome);

      this.hypotheses.setStatus(hypothesis.id, 'resolved');

      for (const note of outcome.agentMemoryNotes) {
        this.agents.addMemory(
          note.agentId,
          note.memorySummary,
          outcome.outcome === 'success' ? 'discovery' : 'failure',
          outcome.outcome === 'success' ? 0.8 : 0.6,
          [hypothesis.id],
        );
      }

      this.epochEvents.push({
        type: 'experiment_resolved',
        agentIds: team.members.map((m) => m.id),
        description: `Experiment "${design.finalHypothesis}" resolved: ${outcome.outcome}`,
        hypothesisId: hypothesis.id,
        teamId: team.id,
        outcome: outcome.outcome,
      });

      this.eventBus.emit({ type: 'experiment_resolved', teamId: team.id, outcome: outcome.outcome, discoveryTitle: null });

      this.relationships.processTeamOutcome(team.memberIds, outcome.outcome === 'success');

      logger.info(
        `Team ${team.id} experiment resolved: ${outcome.outcome}`,
      );
    }

    this.releaseTeamMembers(team);
    this.activeTeams.delete(team.id);
    return true;
  }

  private releaseTeamMembers(team: AgentTeam): void {
    for (const member of team.members) {
      this.agents.setStatus(member.id, 'idle');
    }
  }

  getWorldState(): WorldState {
    return { ...this.worldState };
  }

  getTimeline() {
    return this.timeline.getTimeline();
  }

  getCurrentEpoch(): number {
    return this.currentEpoch;
  }

  getStats() {
    return {
      currentEpoch: this.currentEpoch,
      totalAgents: this.agents.count(),
      totalHypotheses: this.hypotheses.getAllHypotheses().length,
      totalDiscoveries: this.worldState.discoveries.length,
      totalTeams: this.activeTeams.size,
      isRunning: this.running,
      population: this.populationEstimate,
      era: this.worldState.era,
      resources: { ...this.worldState.resources },
      llmCalls: this.countedLlm.count,
    };
  }

  getHistoryTracker(): HistoryTracker {
    return this.historyTracker;
  }

  getEventHistory(): EventHistory {
    return this.eventHistory;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getRelationships(): RelationshipManager {
    return this.relationships;
  }

  getEraManager(): EraManager {
    return this.eraManager;
  }

  getPopulation(): number {
    return this.populationEstimate;
  }
}
