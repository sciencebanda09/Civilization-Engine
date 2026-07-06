export interface EnemyTribe {
  id: string;
  name: string;
  hostility: number;
  strength: number;
  lastAction: number;
  relation: 'hostile' | 'neutral' | 'friendly';
}

export class EnemyManager {
  private tribes: Map<string, EnemyTribe> = new Map();
  private nextId = 1;

  spawn(name: string, strength: number): EnemyTribe {
    const id = `enemy_${this.nextId++}`;
    const tribe: EnemyTribe = { id, name, hostility: 50, strength, lastAction: 0, relation: 'neutral' };
    this.tribes.set(id, tribe);
    return tribe;
  }

  getAll(): EnemyTribe[] {
    return Array.from(this.tribes.values());
  }

  get(id: string): EnemyTribe | undefined {
    return this.tribes.get(id);
  }

  tick(epoch: number, pop: number, defenseLevel: number): string[] {
    const events: string[] = [];
    for (const t of this.tribes.values()) {
      if (epoch - t.lastAction < 3) continue;

      const raidChance = t.hostility / 200 * (1 - defenseLevel / 100);
      if (Math.random() < raidChance) {
        const damage = Math.max(1, Math.floor(t.strength * (0.5 + Math.random() * 0.5) - defenseLevel * 0.3));
        const survived = damage < pop * 0.4;
        if (survived) {
          events.push(`The ${t.name} raided the settlement! Lost ${damage} people. Their hostility deepens.`);
          t.hostility = Math.min(100, t.hostility + 10);
        } else {
          events.push(`The ${t.name} attacked in force! The settlement barely held — ${damage} lost. A dark day.`);
          t.hostility = Math.min(100, t.hostility + 20);
        }
        t.lastAction = epoch;
      } else if (Math.random() < 0.03 && t.hostility > 30) {
        events.push(`Scouts reported ${t.name} movement near the eastern border. Nerves frayed.`);
      } else if (Math.random() < 0.02 && t.hostility < 40) {
        events.push(`A ${t.name} trader visited the settlement with goods. Hostilities eased.`);
        t.hostility = Math.max(0, t.hostility - 10);
      }
    }
    return events;
  }

  adjustHostility(id: string, delta: number): void {
    const t = this.tribes.get(id);
    if (t) t.hostility = Math.max(0, Math.min(100, t.hostility + delta));
  }

  getState() {
    return { tribes: this.getAll() };
  }
}
