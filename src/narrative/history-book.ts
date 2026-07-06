export interface HistoryEntry {
  epoch: number;
  year: number;
  title: string;
  body: string;
  type: 'milestone' | 'disaster' | 'discovery' | 'war' | 'culture' | 'founding';
}

export class HistoryBook {
  private entries: HistoryEntry[] = [];

  record(epoch: number, title: string, body: string, type: HistoryEntry['type']): void {
    this.entries.push({ epoch, year: epoch, title, body, type });
  }

  getAll(): HistoryEntry[] {
    return [...this.entries].sort((a, b) => a.epoch - b.epoch);
  }

  getByEra(eraStart: number, eraEnd: number): HistoryEntry[] {
    return this.entries.filter(e => e.epoch >= eraStart && e.epoch <= eraEnd)
      .sort((a, b) => a.epoch - b.epoch);
  }

  getChapter(epoch: number): HistoryEntry | undefined {
    return this.entries.find(e => e.epoch === epoch);
  }

  printHistory(): string {
    const lines: string[] = [];
    lines.push('  +============================================+');
    lines.push('  |         THE CIVILIZATION CHRONICLES        |');
    lines.push('  +============================================+');

    const chapters = this.getChapters();
    for (const chapter of chapters) {
      lines.push('');
      lines.push(`  ${chapter.title}`);
      lines.push(`  ${'─'.repeat(chapter.title.length)}`);
      for (const entry of chapter.entries) {
        const yearLabel = entry.type === 'founding' ? 'FOUNDING' : `Year ${entry.year}`;
        lines.push(`    [${yearLabel}] ${entry.title}`);
        lines.push(`      ${entry.body}`);
      }
    }

    return lines.join('\n');
  }

  private getChapters(): Array<{ title: string; entries: HistoryEntry[] }> {
    const sorted = this.getAll();
    const chapters: Array<{ title: string; entries: HistoryEntry[] }> = [];
    let currentChapter: HistoryEntry[] = [];
    let chapterStart = 0;

    for (const entry of sorted) {
      if (currentChapter.length > 0 && entry.epoch - chapterStart > 20) {
        chapters.push({
          title: `Chapter ${chapters.length + 1}: Years ${chapterStart}-${currentChapter[currentChapter.length - 1].epoch}`,
          entries: currentChapter,
        });
        currentChapter = [];
        chapterStart = entry.epoch;
      }
      currentChapter.push(entry);
    }

    if (currentChapter.length > 0) {
      chapters.push({
        title: `Chapter ${chapters.length + 1}: Years ${chapterStart}-${currentChapter[currentChapter.length - 1].epoch}`,
        entries: currentChapter,
      });
    }

    return chapters;
  }

  getRecent(epoch: number, count: number = 5): HistoryEntry[] {
    return this.entries
      .filter(e => e.epoch <= epoch)
      .sort((a, b) => b.epoch - a.epoch)
      .slice(0, count);
  }
}
