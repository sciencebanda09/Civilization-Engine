export type AgentTitle = 'inventor' | 'scholar' | 'explorer' | 'leader' | 'crafter' | 'warrior' | 'diplomat' | 'philosopher' | 'artist' | 'farmer' | 'scientist' | 'merchant';

export interface Portrait {
  lines: string[];
  color: string;
}

const PORTRAITS: Record<string, Portrait> = {
  inventor: {
    color: '\x1b[36m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ☝     │',
      ' │  ╱⎺⎺╲   │',
      ' ╰──────────╯',
    ],
  },
  scholar: {
    color: '\x1b[35m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ⌨     │',
      ' │  ╱━━╲   │',
      ' ╰──────────╯',
    ],
  },
  explorer: {
    color: '\x1b[33m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ⎈     │',
      ' │  ╱╲    │',
      ' ╰──────────╯',
    ],
  },
  leader: {
    color: '\x1b[91m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ♔     │',
      ' │  ╱⎺⎺╲   │',
      ' ╰──────────╯',
    ],
  },
  crafter: {
    color: '\x1b[32m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ⚒     │',
      ' │  ╱⎺⎺╲   │',
      ' ╰──────────╯',
    ],
  },
  warrior: {
    color: '\x1b[91m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ⚔     │',
      ' │  ╱⎺⎺╲   │',
      ' ╰──────────╯',
    ],
  },
  diplomat: {
    color: '\x1b[93m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ☮     │',
      ' │  ╱⎺⎺╲   │',
      ' ╰──────────╯',
    ],
  },
  philosopher: {
    color: '\x1b[94m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ?     │',
      ' │  ╱⎺⎺╲   │',
      ' ╰──────────╯',
    ],
  },
  artist: {
    color: '\x1b[95m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ♪     │',
      ' │  ╱⎺⎺╲   │',
      ' ╰──────────╯',
    ],
  },
  farmer: {
    color: '\x1b[92m',
    lines: [
      ' ╭──────────╮',
      ' │ ◉    ◉   │',
      ' │   ⛏     │',
      ' │  ╱⎺⎺╲   │',
      ' ╰──────────╯',
    ],
  },
};

export function getPortrait(archetype: string): Portrait {
  return PORTRAITS[archetype] ?? PORTRAITS.inventor!;
}

export function renderAgentPortrait(name: string, archetype: string, lines: string[]): string[] {
  const p = getPortrait(archetype);
  const R = '\x1b[0m';
  const B = '\x1b[1m';
  const result: string[] = [];
  const nameLine = `${p.color}${B}${name}${R} ${p.color}(${archetype})${R}`;
  result.push(`  ${nameLine}`);
  for (const l of p.lines) {
    result.push(`  ${p.color}${l}${R}`);
  }
  if (lines.length > 0 && lines.some(l => l.trim().length > 0)) {
    result.push(`  ${p.color}╰─${'─'.repeat(10)}╯${R}`);
    for (const l of lines.slice(0, 1)) {
      const trimmed = l.length > 24 ? l.slice(0, 23) + '…' : l;
      result.push(`  ${p.color}│${R} ${trimmed}${' '.repeat(Math.max(0, 24 - trimmed.length))}${p.color}│${R}`);
    }
    result.push(`  ${p.color}╰${'─'.repeat(26)}╯${R}`);
  }
  return result;
}
