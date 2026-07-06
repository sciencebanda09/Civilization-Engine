import type { PoliticalLeaning } from '../types/index.js';

export type CivRelation = 'war' | 'hostile' | 'neutral' | 'friendly' | 'allied' | 'vassal';

export interface DiplomacyState {
  relation: CivRelation;
  trust: number;
  tradeRoute: boolean;
  allianceEpoch: number;
  warEpoch: number;
  tribute: Record<string, number>;
  espionageLevel: number;
  discoveredSecrets: string[];
}

export interface AutonomousCivilization {
  id: string;
  name: string;
  archetype: 'tribal' | 'merchant' | 'militarist' | 'scholar' | 'nomad';
  population: number;
  strength: number;
  wealth: number;
  culture: number;
  territory: number;
  x: number;
  y: number;
  technologies: string[];
  politicalLeaning: PoliticalLeaning;
  hostility: number;
  tradingGoods: string[];
  wants: string[];
  epochFounded: number;
}

export class CivilizationManager {
  private civs: Map<string, AutonomousCivilization> = new Map();
  private diplomacy: Map<string, Map<string, DiplomacyState>> = new Map();
  private nextId = 1;

  spawn(
    name: string,
    archetype: AutonomousCivilization['archetype'],
    pop: number,
    strength: number,
    x: number,
    y: number,
    epoch: number,
  ): AutonomousCivilization {
    const id = `civ_${this.nextId++}`;
    const leaningMap: Record<string, PoliticalLeaning> = {
      tribal: 'isolationist', merchant: 'diplomatic',
      militarist: 'militarist', scholar: 'scholar', nomad: 'expansionist',
    };
    const civ: AutonomousCivilization = {
      id, name, archetype, population: pop, strength, wealth: 30,
      culture: 20, territory: 3, x, y, technologies: ['basic_toolmaking'],
      politicalLeaning: leaningMap[archetype] ?? 'diplomatic',
      hostility: 30 + Math.floor(Math.random() * 40),
      tradingGoods: [],
      wants: ['food', 'wood', 'stone'],
      epochFounded: epoch,
    };
    this.civs.set(id, civ);
    this.diplomacy.set(id, new Map());
    return civ;
  }

  get(id: string): AutonomousCivilization | undefined {
    return this.civs.get(id);
  }

  getAll(): AutonomousCivilization[] {
    return Array.from(this.civs.values());
  }

  getDiplomacy(civId: string, targetId: string): DiplomacyState {
    const map = this.diplomacy.get(civId);
    if (!map) {
      const newMap = new Map<string, DiplomacyState>();
      this.diplomacy.set(civId, newMap);
      return this.initDiplomacy(newMap, targetId);
    }
    let state = map.get(targetId);
    if (!state) {
      state = this.initDiplomacy(map, targetId);
    }
    return state;
  }

  private initDiplomacy(map: Map<string, DiplomacyState>, targetId: string): DiplomacyState {
    const state: DiplomacyState = {
      relation: 'neutral', trust: 0, tradeRoute: false,
      allianceEpoch: 0, warEpoch: 0, tribute: {},
      espionageLevel: 0, discoveredSecrets: [],
    };
    map.set(targetId, state);
    return state;
  }

  tick(epoch: number, mapWidth: number, mapHeight: number): string[] {
    const events: string[] = [];
    const allCivs = this.getAll();

    for (const civ of allCivs) {
      civ.population += Math.floor(Math.random() * 3);
      civ.strength += Math.random() * 0.5;
      civ.wealth += Math.random() * 2;
      civ.culture += Math.random() * 0.3;

      if (Math.random() < 0.05) civ.territory += 1;

      for (const other of allCivs) {
        if (other.id === civ.id) continue;
        const dip = this.getDiplomacy(civ.id, other.id);

        // Trade route establishment
        if (dip.relation === 'friendly' || dip.relation === 'allied') {
          if (!dip.tradeRoute && Math.random() < 0.1) {
            dip.tradeRoute = true;
            events.push(`${civ.name} establishes a trade route with ${other.name}.`);
          }
        }

        // Diplomacy drift
        if (dip.relation === 'neutral' && Math.random() < 0.02) {
          dip.relation = 'friendly';
          dip.trust = 20;
          events.push(`${civ.name} extends friendship to ${other.name}.`);
        } else if (dip.relation === 'friendly' && Math.random() < 0.01) {
          dip.relation = 'allied';
          dip.allianceEpoch = epoch;
          events.push(`${civ.name} and ${other.name} form an alliance!`);
        } else if (dip.relation === 'hostile' && Math.random() < 0.02) {
          dip.relation = 'war';
          dip.warEpoch = epoch;
          events.push(`WAR! ${civ.name} declares war on ${other.name}!`);
        }

        // Trust decay/growth
        if (dip.relation === 'friendly' || dip.relation === 'allied') {
          dip.trust = Math.min(100, dip.trust + 0.5);
        } else if (dip.relation === 'hostile' || dip.relation === 'war') {
          dip.trust = Math.max(-100, dip.trust - 1);
        }
      }
    }

    return events;
  }

  tradeBetween(civ1Id: string, civ2Id: string): string[] {
    const events: string[] = [];
    const c1 = this.civs.get(civ1Id);
    const c2 = this.civs.get(civ2Id);
    if (!c1 || !c2) return events;

    const dip = this.getDiplomacy(civ1Id, civ2Id);
    if (!dip.tradeRoute) return events;

    for (const good of c1.tradingGoods) {
      if (c2.wants.includes(good)) {
        events.push(`${c1.name} trades ${good} to ${c2.name}. Both benefit.`);
        c1.wealth += 5;
        c2.wealth += 3;
        dip.trust = Math.min(100, dip.trust + 2);
        break;
      }
    }

    return events;
  }

  espionage(civId: string, targetId: string): string[] {
    const events: string[] = [];
    const dip = this.getDiplomacy(civId, targetId);
    if (dip.espionageLevel < 50 && Math.random() < 0.3) {
      dip.espionageLevel += 5;
      const secret = `tech_level_${Math.floor(Math.random() * 10)}`;
      dip.discoveredSecrets.push(secret);
      events.push(`Spies from ${civId} uncovered intel about ${targetId}.`);
    }
    return events;
  }
}
