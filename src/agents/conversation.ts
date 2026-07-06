import type { Agent } from '../types/index.js';
import { getStance } from './opinions.js';

export interface ConversationTurn {
  speakerId: string;
  text: string;
  emotion: string;
}

const CONVERSATION_TOPICS = [
  'the recent harvest',
  'defense against enemies',
  'new discoveries',
  'resource shortages',
  'faction politics',
  'building projects',
  'trade opportunities',
  'the weather',
  'ancient legends',
  'children and the future',
  'a past failure',
  'an old grudge',
];

const EMOTIONS = ['thoughtful', 'angry', 'excited', 'worried', 'proud', 'sad', 'hopeful', 'skeptical'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateConversation(
  agent1: Agent,
  agent2: Agent,
  context: {
    recentEvents: string[];
    currentEra: string;
    resources: Record<string, number>;
  },
): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  const stance1 = getStance(agent1, agent2.id);
  const stance2 = getStance(agent2, agent1.id);
  const topic = pick(CONVERSATION_TOPICS);

  const opener = generateLine(agent1, agent2, topic, stance1, context, true);
  turns.push({ speakerId: agent1.id, text: opener, emotion: pick(EMOTIONS) });

  const reply = generateLine(agent2, agent1, topic, stance2, context, false);
  turns.push({ speakerId: agent2.id, text: reply, emotion: pick(EMOTIONS) });

  return turns;
}

function generateLine(
  speaker: Agent,
  listener: Agent,
  topic: string,
  stance: string,
  context: { recentEvents: string[]; currentEra: string; resources: Record<string, number> },
  isOpener: boolean,
): string {
  const name = speaker.name;
  const listenerName = listener.name;
  const traits = speaker.personalityTraits.slice(0, 2).join(' and ');
  const expertise = speaker.expertise.slice(0, 2).join(', ');
  const knownFor = speaker.personality.knownFor.length > 0
    ? `known for ${speaker.personality.knownFor[0]}`
    : 'still finding their place';

  const templates: string[] = [];

  if (isOpener) {
    if (stance === 'ally' || stance === 'friendly') {
      templates.push(
        `${name} greets ${listenerName} warmly: "I was hoping to discuss ${topic} with you."`,
        `${name} approaches ${listenerName}: "${topic} — I trust your judgment on this."`,
        `${name} smiles: "${listenerName}, your expertise in ${expertise} would help with ${topic}."`,
      );
    } else if (stance === 'distrust' || stance === 'enemy') {
      templates.push(
        `${name} eyes ${listenerName} coldly: "We need to talk about ${topic}. Try to be useful."`,
        `${name} scoffs: "${topic} again? You never listen, ${listenerName}."`,
        `${name} speaks through gritted teeth: "I'll say this once about ${topic}."`,
      );
    } else {
      templates.push(
        `${name} nods to ${listenerName}: "Your thoughts on ${topic}?"`,
        `${name} mentions ${topic} to ${listenerName}.`,
        `${name} asks ${listenerName}: "What do you make of ${topic}?"`,
      );
    }
  } else {
    if (stance === 'ally' || stance === 'friendly') {
      templates.push(
        `${listenerName} listens carefully: "You raise a good point, ${name}. I hadn't considered that."`,
        `${listenerName} agrees: "With your expertise in ${expertise}, I trust your view on ${topic}."`,
        `${listenerName} offers: "Let me help with ${topic}. We're stronger together."`,
      );
    } else if (stance === 'distrust' || stance === 'enemy') {
      templates.push(
        `${listenerName} crosses their arms: "You always bring up ${topic} when it suits you, ${name}."`,
        `${listenerName} turns away: "I've heard enough about ${topic}."`,
        `${listenerName} snaps: "Don't lecture me about ${topic}, ${name}. Remember what happened last time?"`,
      );
    } else {
      templates.push(
        `${listenerName} considers: "An interesting thought on ${topic}, ${name}."`,
        `${listenerName} shrugs: "I suppose ${topic} matters, but we have bigger problems."`,
        `${listenerName} replies carefully: "${topic} is worth discussing, but we should be practical."`,
      );
    }
  }

  return pick(templates);
}

export function conversationToString(turns: ConversationTurn[], agents: Map<string, Agent>): string {
  return turns.map(t => {
    const agent = agents.get(t.speakerId);
    const name = agent?.name ?? t.speakerId;
    return `  ${name} [${t.emotion}]: "${t.text}"`;
  }).join('\n');
}
