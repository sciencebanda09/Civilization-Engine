import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { WorldState } from '../types/index.js';

export interface ChapterSave {
  id: string;
  name: string;
  epoch: number;
  era: string;
  timestamp: number;
  worldState: WorldState;
  agentStates: any[];
  agentPersonalities: any[];
  agentOpinions: any[];
  discoveryTitles: string[];
  population: number;
  factionState: any;
  civilizations: any[];
  religions: any[];
  historyBook: any[];
  dynastyState: any;
  legends: any[];
  events: string[];
}

const SAVES_DIR = join(process.cwd(), 'saves');

function ensureDir(): void {
  if (!existsSync(SAVES_DIR)) mkdirSync(SAVES_DIR, { recursive: true });
}

export function saveChapter(name: string, data: Omit<ChapterSave, 'id' | 'name' | 'timestamp'>): ChapterSave {
  ensureDir();
  const save: ChapterSave = {
    id: `ch_${Date.now()}`,
    name,
    timestamp: Date.now(),
    ...data,
  };
  const filename = `${save.id}_${name.replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 30)}.json`;
  writeFileSync(join(SAVES_DIR, filename), JSON.stringify(save, null, 2));
  return save;
}

export function listChapters(): { id: string; name: string; epoch: number; era: string; timestamp: number }[] {
  ensureDir();
  const files = readdirSync(SAVES_DIR).filter(f => f.endsWith('.json'));
  const chapters: ChapterSave[] = [];
  for (const f of files) {
    try {
      chapters.push(JSON.parse(readFileSync(join(SAVES_DIR, f), 'utf-8')));
    } catch { /* skip corrupt */ }
  }
  return chapters.sort((a, b) => b.timestamp - a.timestamp).map(c => ({
    id: c.id, name: c.name, epoch: c.epoch, era: c.era, timestamp: c.timestamp,
  }));
}

export function loadChapter(id: string): ChapterSave | null {
  ensureDir();
  const files = readdirSync(SAVES_DIR).filter(f => f.endsWith('.json') && f.startsWith(id));
  if (files.length === 0) return null;
  try {
    return JSON.parse(readFileSync(join(SAVES_DIR, files[0]!), 'utf-8'));
  } catch {
    return null;
  }
}

export function getChapterNarration(chapter: ChapterSave): string {
  const date = new Date(chapter.timestamp);
  const timeStr = date.toLocaleString();
  return `Chapter "${chapter.name}" — ${chapter.era}, Epoch ${chapter.epoch}. Saved ${timeStr}. Population: ~${chapter.population}.`;
}
