export interface Religion {
  id: string;
  name: string;
  deity: string;
  beliefs: string[];
  rituals: string[];
  followers: number;
  foundingEpoch: number;
  holySite: string | null;
  influence: number;
}

export interface CulturalTradition {
  id: string;
  name: string;
  description: string;
  originEpoch: number;
  spread: number;
}

export class ReligionManager {
  private religions: Religion[] = [];
  private traditions: CulturalTradition[] = [];
  private nextReligionId = 1;
  private nextTraditionId = 1;

  tick(epoch: number, events: string[], population: number): string[] {
    const output: string[] = [];

    // New religion emergence
    if (this.religions.length === 0 && population > 50 && Math.random() < 0.02) {
      const rel = this.spawnReligion(epoch, events);
      this.religions.push(rel);
      output.push(`A new faith emerges: ${rel.name} — worship of ${rel.deity}.`);
    } else if (this.religions.length > 0 && Math.random() < 0.005) {
      const rel = this.spawnReligion(epoch, events);
      this.religions.push(rel);
      output.push(`Schism! A new religion, ${rel.name}, splits from the old ways.`);
    }

    // Religion growth
    for (const rel of this.religions) {
      rel.followers += Math.floor(Math.random() * 3);
      rel.influence = Math.min(100, rel.influence + Math.random() * 0.5);

      if (Math.random() < 0.01 && !rel.holySite) {
        rel.holySite = 'a sacred grove';
        output.push(`${rel.name} declares a holy site: ${rel.holySite}.`);
      }
    }

    // New cultural tradition
    if (population > 30 && Math.random() < 0.01) {
      const trad = this.spawnTradition(epoch, events);
      this.traditions.push(trad);
      output.push(`Cultural tradition emerges: ${trad.name}.`);
    }

    return output;
  }

  private spawnReligion(epoch: number, events: string[]): Religion {
    const disasterEvent = events.find(e => e.includes('flood') || e.includes('drought') || e.includes('earthquake'));
    const discoveryEvent = events.find(e => e.includes('discovered'));

    let deity: string;
    let beliefs: string[];
    let name: string;

    if (disasterEvent) {
      deity = 'The Sky Father';
      beliefs = ['The sky controls our fate', 'Sacrifice brings rain', 'The mountain is sacred'];
      name = 'Sky Worship';
    } else if (discoveryEvent) {
      deity = 'The Knowledge Giver';
      beliefs = ['Discovery is divine', 'Knowledge must be shared', 'The curious are blessed'];
      name = 'The Way of Knowing';
    } else {
      const choices = [
        { deity: 'The Earth Mother', beliefs: ['All life is sacred', 'Nature must be protected', 'The harvest is a gift'], name: 'Earth Faith' },
        { deity: 'The Ancestors', beliefs: ['The dead watch over us', 'Honor your bloodline', 'Ancestors guide our hands'], name: 'Ancestor Veneration' },
        { deity: 'The Sun', beliefs: ['Light is life', 'Darkness is evil', 'The sun rewards the faithful'], name: 'Sun Cult' },
        { deity: 'The River Spirit', beliefs: ['Water gives life', 'The river is a living being', 'Clean water is a blessing'], name: 'River Faith' },
      ];
      const c = choices[Math.floor(Math.random() * choices.length)];
      deity = c.deity;
      beliefs = c.beliefs;
      name = c.name;
    }

    return {
      id: `religion_${this.nextReligionId++}`,
      name,
      deity,
      beliefs,
      rituals: ['prayer', 'offering'],
      followers: Math.floor(10 + Math.random() * 20),
      foundingEpoch: epoch,
      holySite: null,
      influence: 10 + Math.random() * 20,
    };
  }

  private spawnTradition(epoch: number, events: string[]): CulturalTradition {
    const names = [
      'Harvest Festival', 'Ancestor Night', 'Spring Equinox Celebration',
      'Warrior Coming of Age', 'Storytelling Circle', 'Craft Fair',
      'River Ceremony', 'Thanksgiving Feast', 'Remembrance Day',
      'New Year Bonfire',
    ];
    const name = names[Math.floor(Math.random() * names.length)];

    return {
      id: `trad_${this.nextTraditionId++}`,
      name,
      description: `An annual tradition that emerged around ${events[0] ?? 'the early settlement'}`,
      originEpoch: epoch,
      spread: 10 + Math.random() * 30,
    };
  }

  getReligions(): Religion[] {
    return this.religions;
  }

  getTraditions(): CulturalTradition[] {
    return this.traditions;
  }

  getSummary(): string {
    const lines: string[] = [];
    if (this.religions.length > 0) {
      lines.push('Religions:');
      for (const r of this.religions) {
        lines.push(`  ${r.name} (followers: ~${r.followers}, influence: ${r.influence.toFixed(0)})`);
        lines.push(`    Deity: ${r.deity}`);
        lines.push(`    Beliefs: ${r.beliefs.join(', ')}`);
      }
    }
    if (this.traditions.length > 0) {
      lines.push('Traditions:');
      for (const t of this.traditions) {
        lines.push(`  ${t.name} (spread: ${t.spread.toFixed(0)}%)`);
      }
    }
    return lines.join('\n');
  }
}
