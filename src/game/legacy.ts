export interface Legend {
  name: string;
  archetype: string;
  deeds: string[];
  era: string;
  epoch: number;
}

export class LegacySystem {
  private legends: Legend[] = [];
  private maxLegends = 10;

  recordLegend(name: string, archetype: string, deeds: string[], era: string, epoch: number): void {
    this.legends.push({ name, archetype, deeds, era, epoch });
    if (this.legends.length > this.maxLegends) this.legends.shift();
  }

  getLegends(): Legend[] {
    return [...this.legends];
  }

  getInheritedBonuses(): string[] {
    const bonuses: string[] = [];
    if (this.legends.length >= 3) bonuses.push('The wisdom of past generations lives on (+2 starting discoveries)');
    if (this.legends.some(l => l.deeds.some(d => /war|battle|raid|defend/i.test(d)))) bonuses.push('Battle-hardened lineage (+5 starting defense)');
    if (this.legends.some(l => l.deeds.some(d => /craft|build|create|tool|weapon/i.test(d)))) bonuses.push('Artisan bloodline (+10 starting resource production)');
    if (this.legends.some(l => l.deeds.some(d => /explor|map|travel|horizon|beyond/i.test(d)))) bonuses.push('Explorer ancestry (revealed map at start)');
    return bonuses;
  }

  getState() {
    return { legends: this.legends };
  }
}
