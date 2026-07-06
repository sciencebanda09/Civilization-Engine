import type { Agent } from '../types/index.js';

export interface Faction {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
  foundingEpoch: number;
  influence: number;
  coreValues: string[];
  rivalFactionIds: string[];
  alliedFactionIds: string[];
}

export class FactionManager {
  private factions: Map<string, Faction> = new Map();
  private nextId = 1;

  createFaction(name: string, color: string, founder: Agent, epoch: number, values: string[]): Faction {
    const id = `faction_${this.nextId++}`;
    const faction: Faction = {
      id, name, color,
      memberIds: [founder.id],
      foundingEpoch: epoch,
      influence: 10,
      coreValues: values,
      rivalFactionIds: [],
      alliedFactionIds: [],
    };
    this.factions.set(id, faction);
    return faction;
  }

  getFaction(id: string): Faction | undefined {
    return this.factions.get(id);
  }

  getAllFactions(): Faction[] {
    return Array.from(this.factions.values());
  }

  getAgentFaction(agentId: string): Faction | undefined {
    return this.getAllFactions().find(f => f.memberIds.includes(agentId));
  }

  addMember(factionId: string, agentId: string): void {
    const f = this.factions.get(factionId);
    if (f && !f.memberIds.includes(agentId)) {
      f.memberIds.push(agentId);
    }
  }

  setRivalry(f1: string, f2: string): void {
    const a = this.factions.get(f1);
    const b = this.factions.get(f2);
    if (a && b) {
      if (!a.rivalFactionIds.includes(f2)) a.rivalFactionIds.push(f2);
      if (!b.rivalFactionIds.includes(f1)) b.rivalFactionIds.push(f1);
    }
  }

  setAlliance(f1: string, f2: string): void {
    const a = this.factions.get(f1);
    const b = this.factions.get(f2);
    if (a && b) {
      if (!a.alliedFactionIds.includes(f2)) a.alliedFactionIds.push(f2);
      if (!b.alliedFactionIds.includes(f1)) b.alliedFactionIds.push(f1);
    }
  }

  adjustInfluence(factionId: string, delta: number): void {
    const f = this.factions.get(factionId);
    if (f) f.influence = Math.max(0, f.influence + delta);
  }

  tick(epoch: number): string[] {
    const events: string[] = [];
    for (const f of this.getAllFactions()) {
      if (f.influence <= 0) continue;
      if (f.memberIds.length === 0) continue;
      const growth = Math.floor(Math.random() * 3);
      if (growth > 0) {
        this.adjustInfluence(f.id, growth);
      }
      const decay = Math.random() < 0.1 ? 1 : 0;
      if (decay > 0) {
        this.adjustInfluence(f.id, -decay);
      }
      for (const rivalId of f.rivalFactionIds) {
        if (Math.random() < 0.05) {
          this.adjustInfluence(f.id, 2);
          this.adjustInfluence(rivalId, -1);
          events.push(`Tension rises between ${f.name} and ${this.factions.get(rivalId)?.name ?? 'unknown'}`);
        }
      }
    }
    return events;
  }

  getState(): { factions: Faction[] } {
    return { factions: this.getAllFactions() };
  }
}
