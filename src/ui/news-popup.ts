import { R, B, D, I, RED, GRN, YEL, BLU, MAG, CYN, GY, GOLD, PARCH, ORG, W, BG_Y, BG_R, BG_G, BLK } from './ansi.js';

export type NewsCategory = 'discovery' | 'disaster' | 'war' | 'era' | 'milestone' | 'culture' | 'death';

interface NewsPopupConfig {
  category: NewsCategory;
  headline: string;
  body: string[];
  statsDelta?: Record<string, number>;
  color: string;
  icon: string;
}

const NEW_STYLES: Record<NewsCategory, { color: string; icon: string }> = {
  discovery: { color: GRN, icon: '✦' },
  disaster: { color: RED, icon: '💀' },
  war: { color: RED, icon: '⚔' },
  era: { color: GOLD, icon: '◆' },
  milestone: { color: CYN, icon: '★' },
  culture: { color: MAG, icon: '◈' },
  death: { color: GY, icon: '†' },
};

const CATEGORY_ART: Partial<Record<NewsCategory, string[]>> = {
  discovery: [
    '    ╔════════════════════════════╗    ',
    '    ║  ✦  ✦  BREAKTHROUGH  ✦  ✦  ║    ',
    '    ╚════════════════════════════╝    ',
  ],
  disaster: [
    '    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ',
    '    ░░  ⚠  CATASTROPHE  ⚠  ░░    ',
    '    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ',
  ],
  war: [
    '    ═══ ⚔  WAR  ⚔ ═══',
  ],
  era: [
    '    ┏━━━━━━━━━━━━━━━━━━━━━━━━┓    ',
    '    ┃   ★  NEW ERA  ★   ┃    ',
    '    ┗━━━━━━━━━━━━━━━━━━━━━━━━┛    ',
  ],
};

export function showNewsPopup(
  category: NewsCategory,
  headline: string,
  body: string[],
  statsDelta?: Record<string, number>,
): void {
  const style = NEW_STYLES[category];
  const config: NewsPopupConfig = { category, headline, body, statsDelta, color: style.color, icon: style.icon };
  const width = Math.min(72, process.stdout.columns ?? 80);

  const art = CATEGORY_ART[category] ?? [];

  process.stdout.write('\x1b[s');

  const lines: string[] = [];

  lines.push('');
  for (const a of art) {
    const pad = Math.max(0, Math.floor((width - a.length) / 2));
    lines.push(' '.repeat(pad) + style.color + B + a + R);
  }
  lines.push('');

  const hPad = Math.max(0, Math.floor((width - headline.length - 4) / 2));
  lines.push(' '.repeat(hPad) + style.color + B + '『 ' + headline + ' 』' + R);
  lines.push('');

  for (const b of body) {
    lines.push('  ' + style.color + '│' + R + ' ' + D + b + R);
  }
  lines.push('');

  if (statsDelta && Object.keys(statsDelta).length > 0) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(statsDelta)) {
      const sign = v > 0 ? '+' : '';
      const col = v > 0 ? GRN : v < 0 ? RED : GY;
      parts.push(`${col}${k}: ${sign}${v}${R}`);
    }
    lines.push('  ' + GY + '▸ ' + parts.join(' · ') + R);
    lines.push('');
  }

  lines.push('');

  for (const l of lines) process.stdout.write(l + '\n');

  process.stdout.write('\x1b[u');
}

export function showFullScreenPopup(
  category: NewsCategory,
  headline: string,
  body: string[],
  statsDelta?: Record<string, number>,
): Promise<void> {
  return new Promise(resolve => {
    const style = NEW_STYLES[category];
    const width = Math.min(72, process.stdout.columns ?? 80);

    process.stdout.write('\x1b[2J\x1b[H');

    console.log('');
    console.log('');

    const topBorder = style.color + '╔' + '═'.repeat(width - 4) + '╗' + R;
    console.log('  ' + topBorder);

    const art = CATEGORY_ART[category] ?? [];
    for (const a of art) {
      const inner = '║' + ' '.repeat(width - 4) + '║';
      console.log('  ' + style.color + inner + R);
      process.stdout.write('\x1b[1A\x1b[' + (width + 1) + 'G');
      const aPad = Math.max(0, Math.floor((width - 4 - a.length) / 2));
      process.stdout.write(' '.repeat(aPad) + style.color + B + a + R + ' '.repeat(Math.max(0, width - 4 - aPad - a.length)) + style.color + '║' + R + '\n');
    }

    const midBorder = '║' + '═'.repeat(width - 4) + '║';
    console.log('  ' + style.color + midBorder + R);

    const hPad = Math.max(0, Math.floor((width - 4 - headline.length) / 2));
    const hLine = '║' + ' '.repeat(hPad) + B + style.color + headline + R + ' '.repeat(Math.max(0, width - 4 - hPad - headline.length)) + style.color + '║' + R;
    console.log('  ' + hLine);

    console.log('  ' + style.color + '║' + '═'.repeat(width - 4) + '║' + R);

    for (const b of body) {
      const wrapped = wrapText(b, width - 8);
      for (const w of wrapped) {
        console.log('  ' + style.color + '║' + R + '  ' + D + w + R + ' '.repeat(Math.max(0, width - 8 - w.length)) + style.color + '║' + R);
      }
    }
    console.log('');

    if (statsDelta && Object.keys(statsDelta).length > 0) {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(statsDelta)) {
        const sign = v > 0 ? '+' : '';
        const col = v > 0 ? GRN : v < 0 ? RED : GY;
        parts.push(`${col}${k}: ${sign}${v}${R}`);
      }
      const pLine = '║' + '  ' + GY + '▸ ' + parts.join(' · ') + R;
      console.log('  ' + style.color + pLine + R);
      console.log('');
    }

    const bottomBorder = style.color + '╚' + '═'.repeat(width - 4) + '╝' + R;
    console.log('  ' + bottomBorder);

    console.log('');
    console.log('  ' + D + 'Press any key or wait...' + R);

    setTimeout(resolve, 2000);
  });
}

export function detectNewsCategory(event: string): NewsCategory | null {
  if (/discover|breakthrough|invent|found|✧ |✦ /i.test(event)) return 'discovery';
  if (/famine|plague|flood|drought|earthquake|storm|wildfire|catastrophe/i.test(event)) return 'disaster';
  if (/war|attack|raid|invasion|battle|ambush/i.test(event)) return 'war';
  if (/era|age of|epoch|progress/i.test(event)) return 'era';
  if (/founded|built|completed|first/i.test(event)) return 'milestone';
  if (/religion|faith|temple|festival|tradition|culture/i.test(event)) return 'culture';
  if (/died|death|fall of/i.test(event)) return 'death';
  return null;
}

export function buildNewsBody(event: string): string[] {
  const clean = event.replace(/^\[.*?\]\s*/, '').replace(/^📜\s*/, '').replace(/^\*\*\*?\s*/, '');
  const sentences = clean.split(/(?<=\.)\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).length > 60) {
      chunks.push(current);
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [clean];
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).length > maxLen) {
      lines.push(current);
      current = w;
    } else {
      current = current ? current + ' ' + w : w;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}
