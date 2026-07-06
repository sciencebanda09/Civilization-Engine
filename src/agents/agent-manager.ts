import type { Agent, Archetype, AgentStatus } from '../types/index.js';
import type { Memory, MemoryType } from '../types/index.js';
import { createMemory, buildMemoryDigest, pruneMemories } from './memory.js';
import { createPersonality, getOptimizationTarget, ageAgent, personalitySummary } from './personality.js';
import { decayOpinions, opinionSummary } from './opinions.js';
import { logger } from '../utils/logger.js';

let agentCounter = 0;

export interface AgentCreateParams {
  name: string;
  archetype: Archetype;
  personalityTraits: string[];
  expertise: string[];
  expertiseDescription: string;
  goals: string[];
  relationshipSummary?: string;
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();

  createAgent(params: AgentCreateParams): Agent {
    const id = `agent_${++agentCounter}`;
    const agent: Agent = {
      id,
      name: params.name,
      archetype: params.archetype,
      personalityTraits: params.personalityTraits,
      expertise: params.expertise,
      expertiseDescription: params.expertiseDescription,
      goals: params.goals,
      relationshipSummary: params.relationshipSummary ?? '(new arrival)',
      status: 'idle',
      memoryDigest: '(no memories yet)',
      memories: [],
      personality: createPersonality(params.archetype, params.personalityTraits),
      opinions: new Map(),
      visibleResources: null,
      visibleDiscoveries: [],
      visibleEnemies: [],
      optimizationTarget: getOptimizationTarget(params.archetype),
    };
    this.agents.set(id, agent);
    logger.info(`Created agent: ${agent.name} (${id}, ${agent.archetype})`);
    return agent;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByStatus(status: AgentStatus): Agent[] {
    return this.getAllAgents().filter((a) => a.status === status);
  }

  getAgentsByArchetype(archetype: Archetype): Agent[] {
    return this.getAllAgents().filter((a) => a.archetype === archetype);
  }

  setStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
    }
  }

  addMemory(agentId: string, summary: string, type: MemoryType, salience: number, linkedEntities: string[]): Memory {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    const memory = createMemory(agentId, summary, type, salience, linkedEntities);
    agent.memories.push(memory);
    agent.memories = pruneMemories(agent.memories, 200);
    agent.memoryDigest = buildMemoryDigest(agent.memories, 5);
    return memory;
  }

  updateMemoryDigest(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.memoryDigest = buildMemoryDigest(agent.memories, 5);
    }
  }

  getMemoryDigest(agentId: string): string {
    return this.agents.get(agentId)?.memoryDigest ?? '(no memories)';
  }

  getFirstIdleAgent(): Agent | undefined {
    return this.getAllAgents().find((a) => a.status === 'idle');
  }

  getAgentsByIds(ids: string[]): Agent[] {
    return ids.map((id) => this.agents.get(id)).filter((a): a is Agent => a !== undefined);
  }

  count(): number {
    return this.agents.size;
  }

  ageAllAgents(years: number): void {
    for (const agent of this.agents.values()) {
      ageAgent(agent, years);
    }
  }

  decayAllOpinions(): void {
    for (const agent of this.agents.values()) {
      decayOpinions(agent);
    }
  }

  getAgentSummary(id: string): string {
    const agent = this.agents.get(id);
    if (!agent) return '(unknown)';
    const parts = [
      `${agent.name} (${agent.archetype})`,
      personalitySummary(agent),
    ];
    return parts.join(' | ');
  }

  getOpinionDigest(agentId: string): string {
    const agent = this.agents.get(agentId);
    if (!agent) return '';
    const others = this.getAllAgents();
    return opinionSummary(agent, others);
  }
}
