import type { Config } from '../config.js';
import type { WorldState, Agent } from '../types/index.js';
export interface EpochSnapshot {
  epoch: number;
  era: string;
  worldState: {
    era: string;
    epoch: number;
    resources: Record<string, number>;
    discoveries: Array<{ title: string; description: string; epochDiscovered: number }>;
    enabledDomains: string[];
    populationNote: string | null;
  };
  agents: Array<{
    id: string;
    name: string;
    archetype: string;
    expertise: string[];
    status: string;
    memoryCount: number;
    relationships: Record<string, number>;
  }>;
  activeHypotheses: Array<{
    id: string;
    title: string;
    proposerId: string;
    status: string;
    difficulty: string;
  }>;
  activeTeams: Array<{
    id: string;
    hypothesisTitle: string;
    memberIds: string[];
    turnCount: number;
    outcome: string | null;
  }>;
  events: string[];
  metadata: {
    timestamp: number;
    populationEstimate: number;
    currentEra: string;
    totalDiscoveries: number;
  };
}
import type { LLMProvider } from '../llm/provider.js';
import { Orchestrator } from './orchestrator.js';
import { AgentManager } from '../agents/agent-manager.js';
import { writeFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export interface SimulationSave {
  version: number;
  timestamp: number;
  label: string;
  config: Config;
  worldState: WorldState;
  agents: Agent[];
  history: EpochSnapshot[];
  rngSeed: number;
}

export class SimulationSerializer {
  serialize(
    orchestrator: Orchestrator,
    agentManager: AgentManager,
    historyTracker: { getAllSnapshots(): EpochSnapshot[] },
  ): SimulationSave {
    return {
      version: 1,
      timestamp: Date.now(),
      label: '',
      config: (orchestrator as unknown as { config: Config }).config,
      worldState: orchestrator.getWorldState(),
      agents: agentManager.getAllAgents(),
      history: historyTracker.getAllSnapshots(),
      rngSeed: 0,
    };
  }

  deserialize(data: string): SimulationSave {
    return JSON.parse(data) as SimulationSave;
  }

  async saveToFile(save: SimulationSave, filepath: string): Promise<void> {
    const dir = dirname(filepath);
    if (dir !== '.' && dir !== '' && !existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(filepath, JSON.stringify(save, null, 2), 'utf-8');
  }

  async loadFromFile(filepath: string): Promise<SimulationSave> {
    const raw = await readFile(filepath, 'utf-8');
    return this.deserialize(raw);
  }

  async saveToStorage(save: SimulationSave, slot: number): Promise<void> {
    const dir = join('saves', `slot_${slot}`);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    const filepath = join(dir, 'save.json');
    await this.saveToFile(save, filepath);
  }

  async listSaves(
    directory: string,
  ): Promise<
    Array<{ slot: number; label: string; timestamp: number; epoch: number }>
  > {
    if (!existsSync(directory)) {
      return [];
    }
    const entries: Array<{
      slot: number;
      label: string;
      timestamp: number;
      epoch: number;
    }> = [];
    const items = await readdir(directory, { withFileTypes: true });
    for (const item of items) {
      if (!item.isDirectory()) continue;
      const match = item.name.match(/^slot_(\d+)$/);
      if (!match) continue;
      const slot = parseInt(match[1]!, 10);
      const savePath = join(directory, item.name, 'save.json');
      if (!existsSync(savePath)) continue;
      try {
        const raw = await readFile(savePath, 'utf-8');
        const save = JSON.parse(raw) as SimulationSave;
        entries.push({
          slot,
          label: save.label || `Slot ${slot}`,
          timestamp: save.timestamp,
          epoch: save.worldState.epoch,
        });
      } catch {
        // skip corrupt saves
      }
    }
    entries.sort((a, b) => b.timestamp - a.timestamp);
    return entries;
  }
}

export function restoreSave(
  save: SimulationSave,
  config: Config,
  llm: LLMProvider,
): {
  orchestrator: Orchestrator;
  agentManager: AgentManager;
  historyTracker: { getAllSnapshots(): EpochSnapshot[] };
} {
  const agentManager = new AgentManager();
  const agentsMap = new Map<string, Agent>();
  for (const agent of save.agents) {
    agentsMap.set(agent.id, agent);
  }
  (agentManager as unknown as { agents: Map<string, Agent> }).agents = agentsMap;

  const orchestrator = new Orchestrator(
    config,
    llm,
    agentManager,
    save.worldState,
  );

  const historyTracker = {
    getAllSnapshots(): EpochSnapshot[] {
      return save.history;
    },
  };

  return { orchestrator, agentManager, historyTracker };
}
