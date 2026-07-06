import type { Memory, MemoryType } from '../types/index.js';
import { logger } from '../utils/logger.js';

let memoryCounter = 0;

export function createMemory(
  agentId: string,
  summary: string,
  type: MemoryType,
  salience: number,
  linkedEntities: string[],
): Memory {
  return {
    id: `mem_${++memoryCounter}`,
    agentId,
    summary,
    type,
    salience: Math.max(0, Math.min(1, salience)),
    linkedEntities,
    createdAt: Date.now(),
  };
}

export function buildMemoryDigest(memories: Memory[], maxCount = 5): string {
  const sorted = [...memories].sort((a, b) => b.salience - a.salience);
  const top = sorted.slice(0, maxCount);
  if (top.length === 0) return '(no memories yet)';
  return top.map((m) => `- [${m.salience.toFixed(2)}] ${m.summary}`).join('\n');
}

export function pruneMemories(memories: Memory[], maxMemories: number): Memory[] {
  if (memories.length <= maxMemories) return memories;
  const sorted = [...memories].sort((a, b) => b.salience - a.salience);
  logger.debug(`Pruning memories from ${memories.length} to ${maxMemories}`);
  return sorted.slice(0, maxMemories);
}
