export type TribeRelation = 'hostile' | 'neutral' | 'friendly' | 'allied' | 'subjugated';

export interface EnemyTribe {
  id: string;
  name: string;
  hostility: number;
  strength: number;
  lastAction: number;
  relation: TribeRelation;
  x: number;
  y: number;
  territory: number;
  morale: number;
  technology: number;
  supplyLines: number;
  commanderSkill: number;
  experience: number;
}

export interface BattleResult {
  attacker: string;
  defender: string;
  attackerLosses: number;
  defenderLosses: number;
  attackerMorale: number;
  defenderMorale: number;
  outcome: 'attacker_victory' | 'defender_victory' | 'stalemate';
  narrative: string;
  loot: Record<string, number>;
}

export class EnemyManager {
  private tribes: Map<string, EnemyTribe> = new Map();
  private nextId = 1;

  spawn(name: string, strength: number, mapWidth: number, mapHeight: number): EnemyTribe {
    const id = `enemy_${this.nextId++}`;
    const x = Math.floor(Math.random() * (mapWidth - 4)) + 2;
    const y = Math.floor(Math.random() * (mapHeight - 4)) + 2;
    const tribe: EnemyTribe = {
      id, name,
      hostility: 50,
      strength,
      lastAction: 0,
      relation: 'neutral',
      x, y,
      territory: 1,
      morale: 70,
      technology: 30,
      supplyLines: 60,
      commanderSkill: 30 + Math.floor(Math.random() * 40),
      experience: 10 + Math.floor(Math.random() * 30),
    };
    this.tribes.set(id, tribe);
    return tribe;
  }

  getAll(): EnemyTribe[] {
    return Array.from(this.tribes.values());
  }

  get(id: string): EnemyTribe | undefined {
    return this.tribes.get(id);
  }

  tick(
    epoch: number,
    pop: number,
    defenseLevel: number,
    terrainType?: string,
    weather?: string,
  ): string[] {
    const events: string[] = [];

    for (const t of this.tribes.values()) {
      if (epoch - t.lastAction < 2) continue;

      // Morale recovery
      t.morale = Math.min(100, t.morale + 2);

      // Terrain bonus for combat calculations
      const terrainBonus = terrainType === 'mountain' ? 0.3 : terrainType === 'forest' ? 0.2 : 0;
      const weatherMalus = weather === 'winter' ? 0.2 : weather === 'rain' ? 0.1 : 0;

      // Raid logic with morale and terrain
      const raidChance = (t.hostility / 200) * (1 - defenseLevel / 100) * (t.morale / 100) * (1 + terrainBonus);
      if (Math.random() < raidChance) {
        const result = this.resolveBattle(t, pop, defenseLevel, terrainBonus, weatherMalus);
        events.push(result.narrative);

        if (result.outcome === 'attacker_victory') {
          t.morale = Math.min(100, t.morale + 10);
          t.experience = Math.min(100, t.experience + 3);
          t.hostility = Math.min(100, t.hostility + 8);
          for (const [res, amount] of Object.entries(result.loot)) {
            events.push(`${t.name} plundered ${amount} ${res}.`);
          }
        } else {
          t.morale = Math.max(0, t.morale - 15);
          t.hostility = Math.max(0, t.hostility - 5);
          events.push(`${t.name} retreats, demoralized.`);
        }

        t.lastAction = epoch;
      }

      // Territory expansion
      if (t.morale > 60 && t.strength > 20 && Math.random() < 0.02) {
        t.territory += 1;
        events.push(`${t.name} expands its territory.`);
      }

      // Technology drift
      t.technology = Math.min(100, t.technology + Math.random() * 0.5);

      // Supply line degradation
      t.supplyLines = Math.max(0, t.supplyLines - Math.random() * 2);

      // Random event
      if (Math.random() < 0.03 && t.hostility > 30) {
        events.push(`Scouts report ${t.name} movement near the border.`);
      } else if (Math.random() < 0.02 && t.hostility < 40) {
        events.push(`${t.name} traders visit the settlement. Tensions ease.`);
        t.hostility = Math.max(0, t.hostility - 5);
      }
    }

    return events;
  }

  private resolveBattle(
    attacker: EnemyTribe,
    defenderPop: number,
    defenseLevel: number,
    terrainBonus: number,
    weatherMalus: number,
  ): BattleResult {
    const attackPower = attacker.strength * (attacker.morale / 100) * (1 + attacker.commanderSkill / 200) * (1 + attacker.experience / 200) * (1 + terrainBonus);
    const defensePower = defenderPop * 0.3 * (defenseLevel / 100) * (1 - weatherMalus) + defenderPop * 0.1;

    const total = attackPower + defensePower;
    const attackRatio = attackPower / Math.max(1, total);

    let outcome: 'attacker_victory' | 'defender_victory' | 'stalemate';
    let attackerLosses: number;
    let defenderLosses: number;
    let loot: Record<string, number> = {};

    if (attackRatio > 0.65) {
      outcome = 'attacker_victory';
      attackerLosses = Math.floor(attackPower * 0.1 * Math.random());
      defenderLosses = Math.floor(defenderPop * 0.15 * Math.random()) + 2;
      loot = { food: Math.floor(10 + Math.random() * 30), gold: Math.floor(Math.random() * 10) };
    } else if (attackRatio > 0.4) {
      outcome = 'stalemate';
      attackerLosses = Math.floor(attackPower * 0.15 * Math.random());
      defenderLosses = Math.floor(defenderPop * 0.08 * Math.random());
    } else {
      outcome = 'defender_victory';
      attackerLosses = Math.floor(attackPower * 0.25 * Math.random()) + 3;
      defenderLosses = Math.floor(defenderPop * 0.05 * Math.random());
    }

    const narrative = outcome === 'attacker_victory'
      ? `${attacker.name} breaks through! ${defenderLosses} defenders lost, ${attackerLosses} attackers fallen.`
      : outcome === 'stalemate'
        ? `${attacker.name} clashes with defenders. Both sides take losses (${attackerLosses} vs ${defenderLosses}).`
        : `${attacker.name} attacks but is repelled! ${attackerLosses} attackers slain.`;

    return { attacker: attacker.id, defender: 'settlement', attackerLosses, defenderLosses, attackerMorale: attacker.morale, defenderMorale: defenseLevel, outcome, narrative, loot };
  }

  adjustHostility(id: string, delta: number): void {
    const t = this.tribes.get(id);
    if (t) t.hostility = Math.max(0, Math.min(100, t.hostility + delta));
  }

  getState() {
    return { tribes: this.getAll() };
  }
}
