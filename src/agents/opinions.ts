import type { Agent, AgentOpinion } from '../types/index.js';

export function createOpinion(targetId: string, initialTrust = 0): AgentOpinion {
  return {
    targetId,
    trust: initialTrust,
    respect: initialTrust,
    fear: 0,
    lastInteraction: 0,
    grudge: null,
    debt: 0,
  };
}

export function modifyTrust(agent: Agent, targetId: string, delta: number, reason: string | null, epoch: number): void {
  const opinion = getOrCreateOpinion(agent, targetId);
  opinion.trust = Math.max(-100, Math.min(100, opinion.trust + delta));
  opinion.lastInteraction = epoch;
  if (delta < -20 && reason) {
    opinion.grudge = reason;
  }
  if (delta > 0 && opinion.grudge && delta > 30) {
    opinion.grudge = null;
  }
}

export function modifyRespect(agent: Agent, targetId: string, delta: number): void {
  const opinion = getOrCreateOpinion(agent, targetId);
  opinion.respect = Math.max(-100, Math.min(100, opinion.respect + delta));
}

export function modifyFear(agent: Agent, targetId: string, delta: number): void {
  const opinion = getOrCreateOpinion(agent, targetId);
  opinion.fear = Math.max(0, Math.min(100, opinion.fear + delta));
}

export function addDebt(agent: Agent, targetId: string, amount: number): void {
  const opinion = getOrCreateOpinion(agent, targetId);
  opinion.debt += amount;
}

export function getNetOpinion(agent: Agent, targetId: string): number {
  const o = agent.opinions.get(targetId);
  if (!o) return 0;
  return (o.trust + o.respect) / 2 - o.fear * 0.3;
}

export function wouldSupport(agent: Agent, targetId: string, threshold = 0): boolean {
  return getNetOpinion(agent, targetId) >= threshold;
}

export function wouldOppose(agent: Agent, targetId: string, threshold = -20): boolean {
  return getNetOpinion(agent, targetId) <= threshold;
}

export function getStance(agent: Agent, targetId: string): 'ally' | 'friendly' | 'neutral' | 'distrust' | 'enemy' {
  const net = getNetOpinion(agent, targetId);
  if (net >= 50) return 'ally';
  if (net >= 15) return 'friendly';
  if (net >= -15) return 'neutral';
  if (net >= -40) return 'distrust';
  return 'enemy';
}

export function decayOpinions(agent: Agent): void {
  for (const [id, opinion] of agent.opinions) {
    if (opinion.trust > 0) opinion.trust = Math.max(0, opinion.trust - 1);
    if (opinion.trust < 0) opinion.trust = Math.min(0, opinion.trust + 1);
    if (opinion.debt > 0) opinion.debt = Math.max(0, opinion.debt - 1);
  }
}

export function opinionSummary(agent: Agent, allAgents: Agent[]): string {
  const lines: string[] = [];
  for (const other of allAgents) {
    if (other.id === agent.id) continue;
    const stance = getStance(agent, other.id);
    const o = agent.opinions.get(other.id);
    if (!o) continue;
    let desc = `${other.name}: ${stance}`;
    if (o.grudge) desc += ` (grudge: ${o.grudge})`;
    if (o.debt > 0) desc += ` (owes ${o.debt})`;
    lines.push(desc);
  }
  return lines.join('\n');
}

function getOrCreateOpinion(agent: Agent, targetId: string): AgentOpinion {
  let opinion = agent.opinions.get(targetId);
  if (!opinion) {
    opinion = createOpinion(targetId, 0);
    agent.opinions.set(targetId, opinion);
  }
  return opinion;
}
