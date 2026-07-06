export interface RelationshipConfig {
  initialTrust: number;
  decayPerEpoch: number;
  teamSuccessBonus: number;
  teamFailurePenalty: number;
  sameExpertiseAffinity: number;
  opposingArchetypePenalty: number;
}

export const DEFAULT_RELATIONSHIP_CONFIG: RelationshipConfig = {
  initialTrust: 0.1,
  decayPerEpoch: 0.02,
  teamSuccessBonus: 0.15,
  teamFailurePenalty: -0.1,
  sameExpertiseAffinity: 0.05,
  opposingArchetypePenalty: -0.03,
};

function pairKey(id1: string, id2: string): string {
  return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class RelationshipManager {
  private relationships: Map<string, Map<string, number>> = new Map();
  private config: RelationshipConfig;

  constructor(config?: RelationshipConfig) {
    this.config = config ?? { ...DEFAULT_RELATIONSHIP_CONFIG };
  }

  getRelationship(agentId1: string, agentId2: string): number {
    if (agentId1 === agentId2) return 1;
    const key = pairKey(agentId1, agentId2);
    const inner = this.relationships.get(key);
    if (!inner) return 0;
    return inner.get(agentId1) ?? inner.get(agentId2) ?? 0;
  }

  modifyRelationship(agentId1: string, agentId2: string, delta: number): void {
    if (agentId1 === agentId2) return;
    const key = pairKey(agentId1, agentId2);
    let inner = this.relationships.get(key);
    if (!inner) {
      inner = new Map<string, number>();
      this.relationships.set(key, inner);
    }
    const current = inner.get(agentId1) ?? inner.get(agentId2) ?? 0;
    const updated = clamp(current + delta, -1, 1);
    inner.set(agentId1, updated);
    inner.set(agentId2, updated);
  }

  setInitialRelationships(agentIds: string[]): void {
    for (let i = 0; i < agentIds.length; i++) {
      for (let j = i + 1; j < agentIds.length; j++) {
        const key = pairKey(agentIds[i], agentIds[j]);
        let inner = this.relationships.get(key);
        if (!inner) {
          inner = new Map<string, number>();
          this.relationships.set(key, inner);
        }
        inner.set(agentIds[i], this.config.initialTrust);
        inner.set(agentIds[j], this.config.initialTrust);
      }
    }
  }

  processTeamOutcome(memberIds: string[], success: boolean): void {
    const delta = success ? this.config.teamSuccessBonus : this.config.teamFailurePenalty;
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        this.modifyRelationship(memberIds[i], memberIds[j], delta);
      }
    }
  }

  getAlliances(threshold = 0.5): Array<{ agentId: string; allies: string[] }> {
    const result: Array<{ agentId: string; allies: string[] }> = [];
    const agentAllies = new Map<string, string[]>();

    for (const [key, inner] of this.relationships) {
      const [id1, id2] = key.split("_");
      const value = inner.get(id1) ?? 0;
      if (value > threshold) {
        if (!agentAllies.has(id1)) agentAllies.set(id1, []);
        if (!agentAllies.has(id2)) agentAllies.set(id2, []);
        agentAllies.get(id1)!.push(id2);
        agentAllies.get(id2)!.push(id1);
      }
    }

    for (const [agentId, allies] of agentAllies) {
      result.push({ agentId, allies });
    }
    return result;
  }

  getRivalries(threshold = -0.5): Array<{ agentId: string; rivals: string[] }> {
    const result: Array<{ agentId: string; rivals: string[] }> = [];
    const agentRivals = new Map<string, string[]>();

    for (const [key, inner] of this.relationships) {
      const [id1, id2] = key.split("_");
      const value = inner.get(id1) ?? 0;
      if (value < threshold) {
        if (!agentRivals.has(id1)) agentRivals.set(id1, []);
        if (!agentRivals.has(id2)) agentRivals.set(id2, []);
        agentRivals.get(id1)!.push(id2);
        agentRivals.get(id2)!.push(id1);
      }
    }

    for (const [agentId, rivals] of agentRivals) {
      result.push({ agentId, rivals });
    }
    return result;
  }

  getAgentRelationships(agentId: string): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, inner] of this.relationships) {
      const [id1, id2] = key.split("_");
      if (id1 === agentId) {
        const val = inner.get(id2);
        if (val !== undefined) result[id2] = val;
      } else if (id2 === agentId) {
        const val = inner.get(id1);
        if (val !== undefined) result[id1] = val;
      }
    }
    return result;
  }

  decayAll(agentIds: string[]): void {
    for (let i = 0; i < agentIds.length; i++) {
      for (let j = i + 1; j < agentIds.length; j++) {
        const key = pairKey(agentIds[i], agentIds[j]);
        const inner = this.relationships.get(key);
        if (inner) {
          const current = inner.get(agentIds[i]) ?? 0;
          const decayed = Math.abs(current) > this.config.decayPerEpoch
            ? current - Math.sign(current) * this.config.decayPerEpoch
            : 0;
          inner.set(agentIds[i], clamp(decayed, -1, 1));
          inner.set(agentIds[j], clamp(decayed, -1, 1));
        }
      }
    }
  }

  toJSON(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const [key, inner] of this.relationships) {
      const obj: Record<string, number> = {};
      for (const [id, val] of inner) {
        obj[id] = val;
      }
      result[key] = obj;
    }
    return result;
  }

  fromJSON(data: Record<string, Record<string, number>>): void {
    this.relationships.clear();
    for (const [key, innerObj] of Object.entries(data)) {
      const inner = new Map<string, number>();
      for (const [id, val] of Object.entries(innerObj)) {
        inner.set(id, val);
      }
      this.relationships.set(key, inner);
    }
  }
}
