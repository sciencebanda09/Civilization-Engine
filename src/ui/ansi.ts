export const R = '\x1b[0m', B = '\x1b[1m', D = '\x1b[2m', I = '\x1b[3m', U = '\x1b[4m';
export const RED = '\x1b[31m', GRN = '\x1b[32m', YEL = '\x1b[33m', BLU = '\x1b[34m';
export const MAG = '\x1b[35m', CYN = '\x1b[36m', W = '\x1b[37m', GY = '\x1b[90m';
export const ORG = '\x1b[38;5;214m', GOLD = '\x1b[38;5;220m', PARCH = '\x1b[38;5;187m';
export const BLK = '\x1b[30m';
export const BG_R = '\x1b[41m', BG_G = '\x1b[42m', BG_Y = '\x1b[43m', BG_B = '\x1b[44m';
export const BG_M = '\x1b[45m', BG_C = '\x1b[46m', BG_W = '\x1b[47m', BG_K = '\x1b[40m';

export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

export function hideCursor(): void {
  process.stdout.write('\x1b[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1b[?25h');
}

export function saveCursor(): void {
  process.stdout.write('\x1b[s');
}

export function restoreCursor(): void {
  process.stdout.write('\x1b[u');
}

export function moveTo(row: number, col: number): void {
  process.stdout.write(`\x1b[${row};${col}H`);
}

export function terminalWidth(): number {
  return Math.min(process.stdout.columns || 80, 88);
}

const W_TERM = 78;

export function separator(char = '-', color = GY, newline = true): string {
  const w = terminalWidth();
  return color + char.repeat(w) + R + (newline ? '\n' : '');
}

export function box(title: string, lines: string[], border = GOLD, titleColor = GOLD): void {
  const w = Math.min(Math.max(title.length + 8, ...lines.map(l => l.length + 8), 50), W_TERM - 2);
  console.log(border + '+' + '-'.repeat(w - 2) + '+' + R);
  const tPad = w - 4 - title.length;
  const tL = Math.floor(tPad / 2);
  const tR = tPad - tL;
  console.log(border + '|' + R + ' '.repeat(tL) + titleColor + B + title + R + ' '.repeat(tR) + border + '|' + R);
  if (lines.length > 0) {
    console.log(border + '|' + '-'.repeat(w - 2) + '|' + R);
    for (const l of lines) {
      const text = l.length > w - 6 ? l.slice(0, w - 7) + '…' : l;
      console.log(border + '|' + R + ' ' + text + ' '.repeat(w - 4 - text.length) + border + '|' + R);
    }
  }
  console.log(border + '+' + '-'.repeat(w - 2) + '+' + R);
}

export function smallBox(lines: string[], border = CYN): void {
  const w = Math.min(Math.max(...lines.map(l => l.length + 6), 40), W_TERM - 2);
  console.log(border + '+' + '-'.repeat(w - 2) + '+' + R);
  for (const l of lines) {
    const text = l.length > w - 6 ? l.slice(0, w - 7) + '…' : l;
    console.log(border + '|' + R + ' ' + text + ' '.repeat(w - 4 - text.length) + border + '|' + R);
  }
  console.log(border + '+' + '-'.repeat(w - 2) + '+' + R);
}

export function progressBar(value: number, max: number, width: number, fill: string, empty = GY): string {
  const f = Math.min(Math.max(Math.round((value / Math.max(max, 1)) * width), 0), width);
  return fill + '█'.repeat(f) + R + empty + '░'.repeat(width - f) + R;
}

export function resourceLine(icon: string, label: string, value: number, max: number, color: string): string {
  return `  ${icon} ${B}${label}${R} ${progressBar(value, max, 16, color)} ${GY}${Math.round(value)}${R}`;
}

export function statLine(items: { label: string; value: string; color?: string }[]): string {
  return items.map(i => `${i.color || GY}${i.label}:${R} ${i.value}`).join(` ${GY}│${R} `);
}

export async function flash(text: string, bg: string, fg = BLK, ms = 120): Promise<void> {
  process.stdout.write(bg + fg + B + ' ' + text + ' ' + R + '\n');
  await new Promise(r => setTimeout(r, ms));
}

export async function epochFlash(text: string, bg: string, fg = BLK): Promise<void> {
  const w = terminalWidth();
  process.stdout.write(bg + fg + B + ' ' + text.padEnd(w - 2) + R + '\n');
  await new Promise(r => setTimeout(r, 80));
}

export function spinnerMessage(msg: string): string {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const idx = Math.floor(Date.now() / 100) % frames.length;
  return `  ${CYN}${frames[idx]!}${R} ${GY}${msg}${R}`;
}

let spinnerTimer: ReturnType<typeof setInterval> | null = null;

export function startSpinner(msg: string): void {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const w = terminalWidth();
  spinnerTimer = setInterval(() => {
    const line = `  ${CYN}${frames[i++]!}${R} ${GY}${msg}${R}`;
    process.stdout.write(`\r${line.padEnd(w)}`);
    i %= frames.length;
  }, 100);
}

export function stopSpinner(): void {
  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    spinnerTimer = null;
    const w = terminalWidth();
    process.stdout.write(`\r${' '.repeat(w)}\r`);
  }
}

export function enemyTaunt(name: string, hostility: number): string {
  const taunts: Record<string, string[]> = {
    'Grey Wolves': [
      `"The ${name} howl at your gates. Winter is coming for you."`,
      `A ${name} scout is spotted on the ridge. He raises a wolf-skull banner.`,
      `"Your walls are twigs," the ${name} chieftain laughs. "We will snap them."`,
    ],
    'Iron Serpents': [
      `"The ${name} poison your well while you sleep," the trader whispers.`,
      `A ${name} arrow thuds into the gate. A note is tied to it: "Leave or die."`,
      `"Your children will wear our marks," the ${name} shaman hisses.`,
    ],
    'Red Hand': [
      `"The ${name} burned a village to the east. Their fires are moving this way."`,
      `A ${name} warband marches past the horizon. Counting your numbers.`,
      `"Submit or burn," the ${name} warlord's message reads.`,
    ],
  };
  const pool = taunts[name] || [
    `"The ${name} are watching," the scouts report.`,
    `A ${name} raiding party is seen gathering.`,
  ];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function combatLog(
  enemyName: string,
  damage: number,
  survived: boolean,
  defenderName?: string,
): string[] {
  const lines: string[] = [];
  lines.push(`${RED}${B}⚔ COMBAT — ${enemyName.toUpperCase()}${R}`);
  lines.push(`  ${GY}War drums echo through the valley...${R}`);
  if (defenderName) {
    lines.push(`  ${YEL}${defenderName}${R} ${GY}rallies the defenders!${R}`);
  }
  if (survived) {
    lines.push(`  ${RED}${damage} villagers lost.${R} ${GRN}The enemy is driven back!${R}`);
  } else {
    lines.push(`  ${RED}${B}${damage} villagers lost!${R} ${YEL}The settlement barely holds...${R}`);
  }
  return lines;
}

function buildArtBox(lines: string[]): string[] {
  const inner = Math.max(...lines.map(l => l.length), 10);
  const result: string[] = [];
  result.push('+' + '-'.repeat(inner + 2) + '+');
  for (const l of lines) {
    result.push('| ' + l + ' '.repeat(inner - l.length + 1) + '|');
  }
  result.push('+' + '-'.repeat(inner + 2) + '+');
  return result;
}

export const TITLE_ART = buildArtBox([
  '  ██████╗██╗██╗   ██╗██╗██╗',
  '  ██╔════╝██║██║   ██║██║██║',
  '  ██║     ██║██║   ██║██║██║',
  '  ██║     ██║╚██╗ ██╔╝██║██║',
  '  ╚██████╗██║ ╚════╝ ██║███████╗',
  '   ╚═════╝╚═╝         ╚═╝╚══════╝',
]);
