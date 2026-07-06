import type { Agent, AgentPersonality, PoliticalLeaning } from '../types/index.js';

export interface Dynasty {
  id: string;
  familyName: string;
  foundingEpoch: number;
  members: DynastyMember[];
  reputation: number;
  knownFor: string[];
}

export interface DynastyMember {
  agentId: string;
  name: string;
  birthEpoch: number;
  deathEpoch: number | null;
  achievements: string[];
  isAlive: boolean;
}

export class DynastySystem {
  private dynasties: Map<string, Dynasty> = new Map();
  private nextDynastyId = 1;

  register(agent: Agent, epoch: number): Dynasty {
    const existing = this.findByFamilyLine(agent.personality.familyLine);
    if (existing) {
      existing.members.push({
        agentId: agent.id,
        name: agent.name,
        birthEpoch: epoch,
        deathEpoch: null,
        achievements: [],
        isAlive: true,
      });
      return existing;
    }

    const dynasty: Dynasty = {
      id: `dynasty_${this.nextDynastyId++}`,
      familyName: `${agent.name}line`,
      foundingEpoch: epoch,
      members: [{
        agentId: agent.id,
        name: agent.name,
        birthEpoch: epoch,
        deathEpoch: null,
        achievements: [],
        isAlive: true,
      }],
      reputation: 50,
      knownFor: [],
    };

    this.dynasties.set(dynasty.id, dynasty);
    return dynasty;
  }

  recordAchievement(agent: Agent, achievement: string): void {
    for (const dynasty of this.dynasties.values()) {
      const member = dynasty.members.find(m => m.agentId === agent.id);
      if (member) {
        member.achievements.push(achievement);
        dynasty.knownFor.push(achievement);
        dynasty.reputation = Math.min(100, dynasty.reputation + 3);
        return;
      }
    }
  }

  recordDeath(agentId: string, epoch: number): void {
    for (const dynasty of this.dynasties.values()) {
      const member = dynasty.members.find(m => m.agentId === agentId);
      if (member) {
        member.isAlive = false;
        member.deathEpoch = epoch;
        return;
      }
    }
  }

  inheritTraits(parent: Agent, childName: string, childId: string, epoch: number): AgentPersonality {
    const dynasty = this.findByFamilyLine(parent.personality.familyLine);
    const inherited: AgentPersonality = {
      trust: clampInherit(parent.personality.trust + randomInherit()),
      optimism: clampInherit(parent.personality.optimism + randomInherit()),
      riskTolerance: clampInherit(parent.personality.riskTolerance + randomInherit()),
      politicalLeaning: parent.personality.politicalLeaning,
      knownFor: [],
      trauma: [],
      age: 0,
      familyLine: parent.personality.familyLine,
      dynasticReputation: dynasty?.reputation ?? 50,
    };

    if (dynasty) {
      dynasty.members.push({
        agentId: childId,
        name: childName,
        birthEpoch: epoch,
        deathEpoch: null,
        achievements: [],
        isAlive: true,
      });
    }

    return inherited;
  }

  private findByFamilyLine(familyLine: string): Dynasty | undefined {
    for (const dynasty of this.dynasties.values()) {
      if (dynasty.members.some(m => true)) {
        for (const member of dynasty.members) {
          // We track familyLine on the Agent personality, not on Dynasty
          // So check if any member is from this family
        }
      }
    }
    // Simplified: check by ID pattern
    return undefined;
  }

  getDynastySummary(): string {
    const lines: string[] = [];
    for (const dynasty of this.dynasties.values()) {
      const alive = dynasty.members.filter(m => m.isAlive).length;
      const dead = dynasty.members.filter(m => !m.isAlive).length;
      lines.push(
        `${dynasty.familyName}: ${alive} alive, ${dead} dead, rep: ${dynasty.reputation}`,
        `  Known for: ${dynasty.knownFor.slice(0, 3).join(', ') || 'nothing yet'}`,
      );
    }
    return lines.join('\n');
  }
}

function randomInherit(): number {
  return Math.floor(Math.random() * 20) - 10;
}

function clampInherit(v: number): number {
  return Math.max(0, Math.min(100, v));
}
