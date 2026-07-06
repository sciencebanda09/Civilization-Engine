import type { Agent, Archetype, AgentStatus } from '../types/index.js';
import type { Memory, MemoryType } from '../types/index.js';
import { createMemory, buildMemoryDigest, pruneMemories } from './memory.js';
import { logger } from '../utils/logger.js';

let agentCounter = 0;

export interface AgentCreateParams {
  name: string;
  archetype: Archetype;
  personalityTraits: string[];
  expertise: string[];
  expertiseDescription: string;
  goals: string[];
  relationshipSummary: string;
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();

  createAgent(params: AgentCreateParams): Agent {
    const id = `agent_${++agentCounter}`;
    const agent: Agent = {
      id,
      ...params,
      status: 'idle',
      memoryDigest: '(no memories yet)',
      memories: [],
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
}
