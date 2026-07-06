import type { Agent } from '../types/index.js';
import { generateConversation, conversationToString } from '../agents/conversation.js';
import { R, B, D, I, RED, GRN, YEL, BLU, MAG, CYN, GY, GOLD, PARCH, ORG, BG_Y, BG_R, BG_G, BLK } from './ansi.js';

export interface ChatterLine {
  agentName: string;
  archetype: string;
  text: string;
  emotion: string;
  timestamp: number;
}

const EMOTION_COLORS: Record<string, string> = {
  thoughtful: CYN,
  angry: RED,
  excited: YEL,
  worried: MAG,
  proud: GRN,
  sad: GY,
  hopeful: GRN,
  skeptical: YEL,
};

const EMOTION_ICONS: Record<string, string> = {
  thoughtful: '🤔',
  angry: '😤',
  excited: '😃',
  worried: '😟',
  proud: '😌',
  sad: '😢',
  hopeful: '🙏',
  skeptical: '🤨',
};

const CHATTER_CACHE: ChatterLine[] = [];

export function generateChatter(
  agents: Agent[],
  context: {
    recentEvents: string[];
    currentEra: string;
    resources: Record<string, number>;
  },
): ChatterLine[] {
  const lines: ChatterLine[] = [];

  if (agents.length < 2) {
    const lone = agents[0];
    if (lone) {
      const thoughts = [
        `"The silence is heavy today..."`,
        `"If only I had someone to discuss ${context.recentEvents[0] ?? 'this'} with."`,
        `"I wonder what the others are doing."`,
      ];
      lines.push({
        agentName: lone.name,
        archetype: lone.archetype,
        text: thoughts[Math.floor(Math.random() * thoughts.length)],
        emotion: 'thoughtful',
        timestamp: Date.now(),
      });
    }
    return lines;
  }

  const shuffled = [...agents].sort(() => Math.random() - 0.5);
  const pairCount = Math.min(2, Math.floor(agents.length / 2));

  for (let p = 0; p < pairCount; p++) {
    const a1 = shuffled[p * 2]!;
    const a2 = shuffled[p * 2 + 1]!;
    const turns = generateConversation(a1, a2, context);
    for (const turn of turns) {
      const speaker = agents.find(a => a.id === turn.speakerId);
      if (speaker) {
        lines.push({
          agentName: speaker.name,
          archetype: speaker.archetype,
          text: turn.text,
          emotion: turn.emotion,
          timestamp: Date.now(),
        });
      }
    }
  }

  CHATTER_CACHE.push(...lines);
  if (CHATTER_CACHE.length > 20) CHATTER_CACHE.splice(0, CHATTER_CACHE.length - 20);

  return lines;
}

export function displayChatter(lines: ChatterLine[]): void {
  const width = Math.min(72, process.stdout.columns ?? 80);

  process.stdout.write('\x1b[s');

  const divider = GY + '┄'.repeat(width - 2) + R;
  console.log('  ' + divider);

  for (const line of lines.slice(0, 4)) {
    const emoColor = EMOTION_COLORS[line.emotion] ?? GY;
    const icon = EMOTION_ICONS[line.emotion] ?? '💬';
    const nameTag = `${B}${line.agentName}${R}${D} ${line.archetype}${R}`;

    const wrapWidth = width - 10;
    let text = line.text;
    if (text.length > wrapWidth) text = text.substring(0, wrapWidth - 3) + '...';

    console.log(`  ${emoColor}${icon}${R} ${nameTag}  ${text}`);
  }

  process.stdout.write('\x1b[u');
}

export function displayChatterBox(lines: ChatterLine[]): void {
  if (lines.length === 0) return;

  const width = Math.min(72, process.stdout.columns ?? 80);
  const innerW = width - 8;

  console.log(GY + '  ┌' + '─'.repeat(width - 6) + '┐' + R);

  for (const line of lines.slice(0, 3)) {
    const emoColor = EMOTION_COLORS[line.emotion] ?? GY;
    const icon = EMOTION_ICONS[line.emotion] ?? '💬';
    const archetypeColor = line.archetype === 'warrior' ? RED : line.archetype === 'scholar' ? CYN : line.archetype === 'diplomat' ? GRN : line.archetype === 'builder' ? YEL : GY;
    const nameTag = `${archetypeColor}${B}${line.agentName}${R}`;

    let text = line.text;
    if (text.length > innerW - 6) text = text.substring(0, innerW - 9) + '...';

    const quotedText = D + text + R;
    console.log(`  ${GY}│${R} ${emoColor}${icon}${R} ${nameTag} ${R}${quotedText}`);
  }

  console.log(GY + '  └' + '─'.repeat(width - 6) + '┘' + R);
}
