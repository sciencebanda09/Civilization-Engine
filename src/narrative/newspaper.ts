import type { Agent } from '../types/index.js';
import type { HistoryEntry } from './history-book.js';

export interface Newspaper {
  headline: string;
  articles: NewspaperArticle[];
  date: string;
  editorNotes: string;
}

export interface NewspaperArticle {
  title: string;
  body: string;
  section: 'front' | 'discoveries' | 'society' | 'trade' | 'opinion';
}

export function generateNewspaper(
  epoch: number,
  agents: Agent[],
  recentEvents: string[],
  historyEntries: HistoryEntry[],
  resources: Record<string, number>,
): Newspaper {
  const food = resources['food'] ?? 0;
  const pop = agents.length;

  // Headline based on most significant event
  let headline = 'Settlement Continues Steady Progress';
  if (recentEvents.some(e => e.includes('discovered'))) headline = 'New Discovery Brings Hope to the People';
  if (recentEvents.some(e => e.includes('Raid') || e.includes('attack') || e.includes('war'))) headline = 'War Drums Beat on the Horizon';
  if (recentEvents.some(e => e.includes('famine') || e.includes('starvation'))) headline = 'Hard Times: Food Stores Running Low';
  if (food > 200) headline = 'Bountiful Harvest Exceeds All Expectations';

  const articles: NewspaperArticle[] = [];

  // Front page
  if (recentEvents.length > 0) {
    articles.push({
      title: headline,
      body: recentEvents.slice(0, 3).join('. '),
      section: 'front',
    });
  }

  // Discoveries
  const discoveries = recentEvents.filter(e => e.includes('discovered') || e.includes('tech') || e.includes('invent'));
  if (discoveries.length > 0) {
    articles.push({
      title: 'Science & Discovery',
      body: discoveries.join('. '),
      section: 'discoveries',
    });
  }

  // Society - agent achievements
  const notableAgents = agents.filter(a => a.personality.knownFor.length > 0);
  if (notableAgents.length > 0) {
    articles.push({
      title: 'Notable Citizens',
      body: notableAgents.map(a => `${a.name}, ${a.archetype}, ${a.personality.knownFor[0]}`).join('. '),
      section: 'society',
    });
  }

  // Trade
  const tradeResources = Object.entries(resources)
    .filter(([, v]) => v > 50)
    .map(([k]) => k);
  if (tradeResources.length > 0) {
    articles.push({
      title: 'Market Report',
      body: `${tradeResources.join(', ')} are abundant this season.`,
      section: 'trade',
    });
  }

  // Opinion from history
  if (historyEntries.length > 0) {
    const lastHistory = historyEntries[historyEntries.length - 1];
    articles.push({
      title: 'Historical Reflection',
      body: `Looking back on Year ${lastHistory.epoch}: "${lastHistory.title}"`,
      section: 'opinion',
    });
  }

  return {
    headline,
    articles,
    date: `Year ${epoch} of the Civilization`,
    editorNotes: `Population: ~${pop * 20} souls | Resources: ${Object.keys(resources).length} types tracked`,
  };
}

export function printNewspaper(paper: Newspaper): string {
  const lines: string[] = [];
  const width = 60;

  lines.push(`  ${'='.repeat(width)}`);
  lines.push(`  ${centerText('THE CIVILIZATION TIMES', width)}`);
  lines.push(`  ${centerText(paper.date, width)}`);
  lines.push(`  ${'='.repeat(width)}`);
  lines.push('');

  lines.push(`  ${'─'.repeat(width)}`);
  lines.push(`  ${centerText('★ ' + paper.headline + ' ★', width)}`);
  lines.push(`  ${'─'.repeat(width)}`);
  lines.push('');

  for (const article of paper.articles) {
    const sectionLabel = article.section.toUpperCase();
    lines.push(`  [${sectionLabel}]`);
    lines.push(`  ${article.title}`);
    lines.push(`  ${article.body}`);
    lines.push('');
  }

  lines.push(`  ${'─'.repeat(width)}`);
  lines.push(`  ${paper.editorNotes}`);
  lines.push(`  ${'═'.repeat(width)}`);

  return lines.join('\n');
}

function centerText(text: string, width: number): string {
  const padding = Math.max(0, width - text.length - 2);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return ' '.repeat(left) + text + ' '.repeat(right);
}
