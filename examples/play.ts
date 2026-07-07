import 'dotenv/config';
import * as readline from 'node:readline';
import {
  Orchestrator, AgentManager, createProvider, loadConfig,
  SCENARIOS, getScenario, generateWorldMap, updateMapFeatures, renderMap,
  FactionManager, EnemyManager, checkWinLose, LegacySystem,
  generateWeather, applyWeatherToResources, getSeasonDrought, getSeasonDescription,
  getRandomCitizenStory, getAgentQuote,
  createGameSession, tickSession, recordHistory, generateSessionNewspaper, getSessionStats,
  personalitySummary, printNewspaper,
  renderDynamicMap, clearFireTiles,
  showNewsPopup, showFullScreenPopup, detectNewsCategory, buildNewsBody,
  generateChatter, displayChatterBox,
  EventCascadeEngine,
  generateLargeScenario,
  logger,
} from '../src/index.js';
import type { WorldState } from '../src/types/index.js';
import type { Season } from '../src/world/weather.js';
import {
  R, B, D, I, RED, GRN, YEL, BLU, MAG, CYN, W, GY, ORG, GOLD, PARCH, BLK,
  BG_R, BG_G, BG_Y, BG_B, BG_M, BG_C, BG_W, BG_K,
  clearScreen, hideCursor, showCursor, flash,
  startSpinner, stopSpinner, enemyTaunt, combatLog, TITLE_ART,
} from '../src/ui/ansi.js';
import {
  getCouncilChoices, getCrisisChoices, getTechChoices, identifyCrisisType,
} from '../src/game/player-decisions.js';

const achieved = new Set<string>();
let allDisc: string[] = [];
let totalRaidsSurvived = 0;
let defenseLevel = 0;
let discoveryBoost = 0;
let popGrowthMod = 1;
let playerChoices: string[] = [];
let gameSession: Awaited<ReturnType<typeof createGameSession>> | null = null;
let cascadeEngine: EventCascadeEngine | null = null;

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
function beep() { process.stdout.write('\x07'); }
function fanfare() { beep(); setTimeout(beep, 120); setTimeout(beep, 240); }
function alarm() { beep(); setTimeout(beep, 80); setTimeout(beep, 160); setTimeout(beep, 240); }

function typewriter(text: string, speed = 14): Promise<void> {
  return new Promise(r => {
    let i = 0;
    const iv = setInterval(() => {
      if (i >= text.length) { clearInterval(iv); r(); }
      else process.stdout.write(text[i++]!);
    }, speed);
  });
}

let rl: readline.Interface;

function initReadline() {
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
}

function closeReadline() {
  try { rl?.close(); } catch {}
}

function ask(q: string): Promise<string> {
  showCursor();
  if (!process.stdin.isTTY) return Promise.resolve('');
  return new Promise(resolve => {
    try {
      rl.question(q, a => { hideCursor(); resolve(a); });
    } catch {
      resolve('');
    }
  });
}

const SPINNER_MSGS = [
  'The scribe prepares the scroll...',
  'Elders gather by the fire...',
  'Scouts survey the land...',
  'The harvest is counted...',
  'Scholars debate the mysteries...',
  'Ancestors whisper from beyond...',
  'The wind carries news from afar...',
  'The tribe awakens at dawn...',
  'Stars wheel overhead...',
  'The chronicle is written...',
];

function randomSpinnerMsg(): string {
  return SPINNER_MSGS[Math.floor(Math.random() * SPINNER_MSGS.length)]!;
}

async function withSpinner<T>(fn: () => Promise<T>): Promise<T> {
  startSpinner(randomSpinnerMsg());
  try {
    const r = await fn();
    stopSpinner();
    return r;
  } catch (e) {
    stopSpinner();
    throw e;
  }
}

// ─── Title Screen ───────────────────────────────────

function printTitle(scenarioCount: number): void {
  clearScreen();
  for (const l of TITLE_ART) console.log(`  ${GOLD}${l}${R}`);
  console.log(`\n  ${GY}${B}MULTI-AGENT CIVILIZATION SIMULATION${R}`);
  console.log(`  ${GY}Interactive CLI Edition${R}\n`);
  console.log(`  ${GOLD}${B}SELECT SCENARIO${R}`);
  console.log(`  ${GY}${'─'.repeat(40)}${R}`);
  for (let i = 0; i < scenarioCount; i++) {
    const s = SCENARIOS[i]!;
    const diffColor = s.difficulty === 'Easy' ? GRN : s.difficulty === 'Extreme' ? RED : s.difficulty === 'Hard' ? YEL : CYN;
    console.log(`  ${i + 1}) ${s.icon || '🌍'} ${B}${s.name}${R} ${diffColor}(${s.difficulty})${R} ${GY}${s.description || ''}${R}`);
  }
  console.log();
}

async function pickScenario(): Promise<{ scenarioId: string; epochs: number; agentCount?: number }> {
  const args = process.argv.slice(2);

  const agentsIdx = args.indexOf('--agents');
  const agentCount = agentsIdx >= 0 && agentsIdx + 1 < args.length
    ? parseInt(args[agentsIdx + 1]!, 10)
    : undefined;

  const argScenario = args.find(a => !/^\d+$/.test(a) && a !== '--agents' && (agentsIdx < 0 || args.indexOf(a) !== agentsIdx + 1));
  const argEpochs = parseInt(args.find(a => /^\d+$/.test(a)) ?? '', 10);

  if (agentCount && agentCount > 0) {
    return { scenarioId: `large_${agentCount}`, epochs: argEpochs || 10, agentCount };
  }

  if (argScenario && SCENARIOS.some(s => s.id === argScenario)) {
    return { scenarioId: argScenario, epochs: argEpochs || 10 };
  }

  printTitle(SCENARIOS.length);
  const pick = await ask(`  ${CYN}Your choice (1-${SCENARIOS.length}) or Enter for default [1]:${R} `);
  const idx = parseInt(pick.trim(), 10);
  const chosen = (idx >= 1 && idx <= SCENARIOS.length) ? SCENARIOS[idx - 1]! : SCENARIOS[0]!;
  const epAnswer = await ask(`  ${CYN}Epochs (Enter for 10):${R} `);
  const epochs = parseInt(epAnswer.trim(), 10) || 10;
  return { scenarioId: chosen.id, epochs };
}

// ─── Enhanced Epoch Display ─────────────────────────

function showEpochSeasonal(
  e: number, total: number, era: string, season: Season,
  pop: number, resources: Record<string, number>,
  agents: { name: string; archetype: string; id: string }[],
  factions: { name: string; influence: number; color: string }[],
  enemies: { name: string; hostility: number }[],
  events: string[],
  mapStr: string,
  session?: typeof gameSession,
): void {
  clearScreen();
  const seasonEmoji: Record<string, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
  const se = seasonEmoji[season.toLowerCase()] ?? '';
  const yrProgress = (e / total) * 100;
  const seasonNames: Record<string, string> = { spring: 'SPRING', summer: 'SUMMER', autumn: 'AUTUMN', winter: 'WINTER' };
  const sn = seasonNames[season.toLowerCase()] ?? season.toUpperCase();

  const climateInfo = session ? `${GY}🌡${session.climate.temperature.toFixed(0)}°C CO₂:${session.climate.co2.toFixed(0)}${R}` : '';

  // Header
  console.log(`  ${GOLD}${B}✦ YEAR ${e}/${total}${R}  ${YEL}${era}${R}  ${se}${CYN}${sn}${R}  ${GY}Pop${R} ${pop}  ${GY}Disc${R} ${allDisc.length} ${climateInfo} ${D}${'█'.repeat(Math.floor(yrProgress / 5))}${'░'.repeat(20 - Math.floor(yrProgress / 5))}${R}`);

  if (session && session.climate.deforestation > 40) console.log(`  ${YEL}⚠ Deforestation: ${session.climate.deforestation.toFixed(0)}%${R}`);
  console.log();

  // Agents with personality (summarize for large populations)
  if (agents.length > 12) {
    const idle = agents.filter(a => {
      const p = session?.agentManager.getAgent(a.id)?.personality;
      return p && p.trust > 50;
    }).length;
    const activeResearchers = agents.filter(a => {
      const p = session?.agentManager.getAgent(a.id)?.personality;
      return p && p.optimism > 60;
    }).length;
    console.log(`  ${GY}${agents.length} villagers, ${activeResearchers} active researchers, ${agents.length - activeResearchers} idle${R}`);
    const topAgents = agents.slice(0, 4).map(a => {
      const p = session?.agentManager.getAgent(a.id)?.personality;
      const trustIcon = p && p.trust > 60 ? GRN : p && p.trust < 30 ? RED : GY;
      return `${trustIcon}${a.name}${R}${D} ${a.archetype.charAt(0)}${R}`;
    }).join(' · ');
    console.log(`  ${D}Notables: ${topAgents}${R}`);
  } else {
    const agLine = agents.map(a => {
      const p = session?.agentManager.getAgent(a.id)?.personality;
      const trustIcon = p && p.trust > 60 ? GRN : p && p.trust < 30 ? RED : GY;
      return `${trustIcon}${a.name}${R}${D} ${a.archetype.charAt(0)}${R}`;
    }).join(' · ');
    console.log(`  ${agLine}`);
  }
  console.log();

  // Resources
  const maxR = Math.max(100, ...Object.values(resources));
  const resColors: Record<string, string> = { food: GRN, wood: YEL, stone: GY, iron: CYN };
  const resIcons: Record<string, string> = { food: '🌾', wood: '🪵', stone: '🪨', iron: '⛏' };
  const entries = Object.entries(resources).filter(([k]) => k in resIcons);
  for (let i = 0; i < entries.length; i += 2) {
    const parts: string[] = [];
    for (let j = i; j < Math.min(i + 2, entries.length); j++) {
      const [k, v] = entries[j]!;
      const col = resColors[k] || GY;
      const icon = resIcons[k] || '•';
      const bar = col + '█'.repeat(Math.round((v / maxR) * 12)) + R + GY + '░'.repeat(12 - Math.min(Math.round((v / maxR) * 12), 12)) + R;
      parts.push(`${icon} ${bar} ${GY}${Math.round(v)}${R}`);
    }
    console.log(`  ${parts.join('   ')}`);
  }
  console.log();

  // Factions + Enemies
  const displayFactions = factions.length > 6 ? factions.slice(0, 4) : factions;
  const fLine = displayFactions.map(f => `${f.color}◆${R}${f.name} ${GY}${f.influence}${R}`).join(' ');
  console.log(`  ${fLine}${factions.length > 6 ? ` ${D}+${factions.length - 4} more${R}` : ''}`);
  if (enemies.length > 0) {
    console.log(`  ${RED}⚠${R} ${enemies.map(e => `${e.name} ${GY}${e.hostility}%${R}`).join(' · ')}  ${GY}🛡${R} ${defenseLevel}`);
  }
  console.log();

  // Civilizations + Religions
  if (session) {
    const civs = session.civManager.getAll();
    if (civs.length > 0) {
      const civLine = civs.map(c => {
        const relColors: Record<string, string> = { war: RED, hostile: YEL, neutral: GY, friendly: GRN, allied: CYN, vassal: MAG } as const;
        const firstOther = civs.find(o => o.id !== c.id);
        const rel = firstOther ? session.civManager.getDiplomacy(c.id, firstOther.id).relation : 'neutral';
        const col = relColors[rel] || GY;
        return `${col}◆${R}${c.name} ${D}pop:${c.population}${R}`;
      }).join(' ');
      console.log(`  ${GY}Civs:${R} ${civLine}`);
    }
    const rels = session.religionManager.getReligions();
    if (rels.length > 0) {
      const relLine = rels.map(r => `${MAG}◈${R}${r.name} ${D}${r.followers} fol${R}`).join(' ');
      console.log(`  ${relLine}`);
    }
  }

  // Active cascades
  if (cascadeEngine) {
    const narratives = cascadeEngine.getActiveNarratives();
    if (narratives.length > 0) {
      console.log(`  ${RED}∞${R} ${narratives.join(' | ')}`);
    }
  }
  console.log();

  // Events
  const shown = events.slice(-4);
  for (const evt of shown) {
    if (evt.includes('[story]')) {
      console.log(`  ${D}📖 ${evt.replace('[story] ', '').substring(0, 65)}${R}`);
      continue;
    }
    let prefix = '·', col = GY;
    if (/discov|breakthrough|discover/i.test(evt)) { prefix = '✦'; col = GRN; }
    else if (/catastrophe|starv|famine|flood|drought|plague|earthquake/i.test(evt)) { prefix = '💀'; col = RED; }
    else if (/raid|attack|enemy|ambush|war/i.test(evt)) { prefix = '⚔'; col = RED; }
    else if (/hypothesis|proposed|question/i.test(evt)) { prefix = '○'; col = MAG; }
    else if (/era|advance|progress/i.test(evt)) { prefix = '◆'; col = YEL; }
    console.log(`  ${col}${prefix}${R} ${evt.substring(0, 72)}`);
  }
  console.log();

  // Dynamic map
  const mapLines = mapStr.split('\n');
  for (const ml of mapLines.slice(0, 10)) console.log(`  ${D}${ml}${R}`);

  // Legend
  console.log(`  ${D}W=wall H=hut F=farm K=market B=barracks P=temple M=mine${R}`);
}

// ─── News Popup Helper ──────────────────────────────

async function checkAndShowNews(events: string[], category?: string): Promise<void> {
  for (const evt of events.slice(-3)) {
    const cat = detectNewsCategory(evt);
    if (cat && (!category || cat === category)) {
      const headline = evt.replace(/^\[.*?\]\s*/, '').replace(/^📜\s*/, '').substring(0, 50);
      const body = buildNewsBody(evt);
      await showFullScreenPopup(cat, headline, body);
      return;
    }
  }
}

// ─── Mid-Epoch Player Actions ───────────────────────

async function midEpochAction(
  agents: { name: string; archetype: string; id: string }[],
  session: typeof gameSession,
): Promise<string | null> {
  const width = Math.min(72, process.stdout.columns ?? 80);
  console.log(`\n  ${GY}${'═'.repeat(width - 4)}${R}`);
  const talkOption = agents.length <= 20 ? `  ${CYN}[T]${R}alk to agent  ` : '';
  console.log(`${talkOption} ${GRN}[D]${R}ecree  ${YEL}[H]${R}istory  ${GY}[Enter]${R} continue`);
  console.log(`  ${GY}${'═'.repeat(width - 4)}${R}`);

  const key = (await ask(`  ${CYN}Action:${R} `)).trim().toLowerCase();
  if ((key === 't' || key === 'talk') && agents.length <= 20) {
    const names = agents.map((a, i) => `${i + 1}) ${a.name} (${a.archetype})`).join('  ');
    const pick = await ask(`  ${CYN}Who?${R} ${names}: `);
    const idx = parseInt(pick.trim(), 10);
    if (idx >= 1 && idx <= agents.length) {
      const agent = agents[idx - 1]!;
      const p = session?.agentManager.getAgent(agent.id)?.personality;
      const summary = p ? personalitySummary({ personality: p } as any) : '';
      const opinionDigest = session?.agentManager.getOpinionDigest(agent.id) ?? '';
      console.log(`\n  ${GOLD}${B}${agent.name} (${agent.archetype})${R}`);
      console.log(`  ${D}${summary}${R}`);
      if (opinionDigest) {
        console.log(`  ${GY}Relationships:${R}`);
        for (const line of opinionDigest.split('\n')) {
          console.log(`  ${D}${line}${R}`);
        }
      }
      await sleep(1500);
    }
  } else if (key === 'd' || key === 'decree') {
    return 'decree';
  } else if (key === 'h' || key === 'history') {
    if (session) {
      console.log(`\n  ${PARCH}${session.historyBook.printHistory()}${R}`);
      await sleep(2000);
    }
  }
  return null;
}

// ─── Decision Prompts ───────────────────────────────

async function councilPrompt(
  choices: Awaited<ReturnType<typeof getCouncilChoices>>,
  world: WorldState,
  pop: number,
): Promise<string> {
  showCursor();
  clearScreen();
  const foodStatus = world.resources.food && world.resources.food < 60 ? `${RED}low${R}` : world.resources.food && world.resources.food > 150 ? `${GRN}plentiful${R}` : `${GY}adequate${R}`;

  console.log(`\n  ${GOLD}${B}★★★★★ COUNCIL OF ELDERS ★★★★★${R}`);
  console.log(`  ${GY}Year ${world.epoch || '?'}  ·  ~${pop} people  ·  Food: ${foodStatus}${R}`);
  console.log();

  for (let i = 0; i < choices.length; i++) {
    const c = choices[i]!;
    const effParts: string[] = [];
    if (c.effect.resources) {
      for (const [k, v] of Object.entries(c.effect.resources)) {
        if (v > 0) effParts.push(`+${v} ${k}`);
        else if (v < 0) effParts.push(`${v} ${k}`);
      }
    }
    if (c.effect.defense) effParts.push(`+${c.effect.defense} def`);
    if (c.effect.discoveryBoost) effParts.push(`research boost`);
    if (c.effect.enemyHostility) effParts.push(`${c.effect.enemyHostility > 0 ? '+' : ''}${c.effect.enemyHostility} enemy`);
    if (c.effect.popLoss) effParts.push(`-${c.effect.popLoss} pop`);
    if (c.effect.popGrowth) effParts.push(`growth boost`);
    if (c.effect.risk) effParts.push(`${Math.round(c.effect.risk * 100)}% risk`);

    const effStr = effParts.length > 0 ? `  ${D}${effParts.join(' · ')}${R}` : '';
    console.log(`  ${CYN}${i + 1})${R} ${c.icon} ${B}${c.title}${R}`);
    if (effStr) console.log(`     ${effStr}`);
  }
  console.log();

  const answer = await ask(`  ${CYN}Your decree (1-${choices.length} or type):${R} `);
  hideCursor();

  const num = parseInt(answer.trim(), 10);
  if (num >= 1 && num <= choices.length) {
    const chosen = choices[num - 1]!;
    playerChoices.push(chosen.id);
    fanfare();
    console.log(`\n  ${D}${chosen.effect.narrative}${R}`);
    await sleep(600);
    return chosen.id;
  }
  playerChoices.push(answer.trim());
  console.log(`\n  ${D}"${answer.trim()}" — the elders nod thoughtfully.${R}`);
  await sleep(600);
  return 'custom';
}

async function crisisPrompt(
  choices: Awaited<ReturnType<typeof getCrisisChoices>>,
  crisisDesc: string,
): Promise<string> {
  showCursor();
  clearScreen();
  console.log(`\n  ${RED}${B}!!!!! DISASTER !!!!!${R}`);
  console.log(`  ${YEL}${crisisDesc.substring(0, 70)}${R}\n`);
  console.log(`  ${GY}How do you respond?${R}\n`);

  for (let i = 0; i < choices.length; i++) {
    const c = choices[i]!;
    const riskDot = c.risk === 'high' ? `${RED}⬤${R}` : c.risk === 'medium' ? `${YEL}⬤${R}` : `${GRN}⬤${R}`;
    const effParts: string[] = [];
    if (c.effect.resources) {
      for (const [k, v] of Object.entries(c.effect.resources)) {
        if (v > 0) effParts.push(`+${v} ${k}`);
        else if (v < 0) effParts.push(`${v} ${k}`);
      }
    }
    if (c.effect.popLoss) effParts.push(`-${c.effect.popLoss} pop`);
    if (c.effect.popGrowth) effParts.push(`+${c.effect.popGrowth} pop`);
    const effStr = effParts.length > 0 ? `  ${D}${effParts.join(' · ')}${R}` : '';
    console.log(`  ${CYN}${i + 1})${R} ${c.icon} ${B}${c.title}${R}  ${riskDot} ${D}${c.risk}${R}`);
    if (effStr) console.log(`     ${effStr}`);
  }
  console.log();

  const answer = await ask(`  ${CYN}Your command (1-${choices.length}):${R} `);
  hideCursor();

  const num = parseInt(answer.trim(), 10);
  if (num >= 1 && num <= choices.length) {
    const chosen = choices[num - 1]!;
    alarm();
    console.log(`\n  ${D}${chosen.effect.narrative}${R}`);
    await sleep(800);
    return chosen.id;
  }
  return choices[0]!.id;
}

async function techPrompt(
  techs: Awaited<ReturnType<typeof getTechChoices>>,
): Promise<string> {
  showCursor();
  clearScreen();
  console.log(`\n  ${MAG}${B}===== PATH OF DISCOVERY =====${R}`);
  console.log(`  ${GY}Your scholars sense a breakthrough. What to pursue?${R}\n`);

  for (let i = 0; i < techs.length; i++) {
    const t = techs[i]!;
    console.log(`  ${CYN}${i + 1})${R} ${B}${t.name}${R}  ${D}${t.era}${R}`);
    console.log(`     ${D}${t.desc}${R}`);
  }
  console.log();

  const answer = await ask(`  ${CYN}Focus research (1-${techs.length}) or skip (Enter):${R} `);
  hideCursor();

  const num = parseInt(answer.trim(), 10);
  if (num >= 1 && num <= techs.length) {
    const chosen = techs[num - 1]!;
    console.log(`\n  ${D}The scholars turn their attention to ${chosen.name}.${R}`);
    await sleep(500);
    return chosen.id;
  }
  return 'skip';
}

// ─── Achievements ───────────────────────────────────

function checkAchievements(stats: any): void {
  const ACH_LIST = [
    { id: 'first_disc', name: 'First Light', desc: 'First discovery made', check: (s: any) => s.totalDiscoveries >= 1 },
    { id: 'hyp_10', name: 'Big Thinkers', desc: '10 hypotheses proposed', check: (s: any) => s.totalHypotheses >= 10 },
    { id: 'hyp_25', name: 'Think Tank', desc: '25 hypotheses proposed', check: (s: any) => s.totalHypotheses >= 25 },
    { id: 'disc_5', name: 'Enlightened', desc: '5 discoveries made', check: (s: any) => s.totalDiscoveries >= 5 },
    { id: 'disc_10', name: 'Golden Age', desc: '10 discoveries made', check: (s: any) => s.totalDiscoveries >= 10 },
    { id: 'pop_100', name: 'Village', desc: 'Population reaches 100', check: (s: any) => (s.population ?? 0) >= 100 },
    { id: 'pop_200', name: 'Town', desc: 'Population reaches 200', check: (s: any) => (s.population ?? 0) >= 200 },
    { id: 'survive_5_raids', name: 'Unbowed', desc: 'Survive 5 raids', check: () => totalRaidsSurvived >= 5 },
    { id: 'era_advance', name: 'Age Up!', desc: 'Advance to a new era', check: (s: any) => (s.eraAdvancements ?? 0) >= 1 },
    { id: 'food_500', name: 'Breadbasket', desc: 'Stockpile 500 food', check: (s: any) => (s.resources?.food ?? 0) >= 500 },
  ];

  for (const a of ACH_LIST) {
    if (!achieved.has(a.id) && a.check(stats)) {
      achieved.add(a.id);
      fanfare();
      console.log(`\n  ${BG_Y}${BLK}${B}  🏆 ACHIEVEMENT: ${a.name} — ${a.desc}  ${R}\n`);
      sleep(400);
    }
  }
}

// ─── Apply Player Effects ───────────────────────────

function applyCouncilEffect(
  choiceId: string,
  world: any,
  enemyManager: EnemyManager,
): void {
  const allEnemies = enemyManager.getAll();
  if (!world.resources) world.resources = { food: 50, wood: 50, stone: 50, iron: 0 };

  switch (choiceId) {
    case 'gather_food':
      world.resources.food = (world.resources.food ?? 0) + 35;
      world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 3);
      world.resources.stone = Math.max(0, (world.resources.stone ?? 0) - 3);
      break;
    case 'fortify':
      defenseLevel += 20;
      world.resources.stone = Math.max(0, (world.resources.stone ?? 0) - 20);
      world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 10);
      break;
    case 'research':
      discoveryBoost = Math.min(discoveryBoost + 2, 5);
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 10);
      break;
    case 'expand':
      popGrowthMod = 1.5;
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 15);
      world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 12);
      break;
    case 'trade':
      world.resources.food = (world.resources.food ?? 0) + 15;
      world.resources.wood = (world.resources.wood ?? 0) + 15;
      world.resources.stone = (world.resources.stone ?? 0) + 10;
      break;
    case 'war_party': {
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 15);
      world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 10);
      for (const en of allEnemies) enemyManager.adjustHostility(en.id, -25);
      break;
    }
    case 'diplomacy':
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 5);
      for (const en of allEnemies) {
        if (en.hostility < 30) enemyManager.adjustHostility(en.id, -15);
      }
      break;
  }
}

function applyCrisisEffect(
  choiceId: string,
  world: any,
): string {
  if (!world.resources) world.resources = { food: 50, wood: 50, stone: 50, iron: 0 };
  let narrative = '';

  switch (choiceId) {
    case 'fish': world.resources.food = (world.resources.food ?? 0) + 50; break;
    case 'forage': world.resources.food = (world.resources.food ?? 0) + 25; world.resources.wood = (world.resources.wood ?? 0) + 15; break;
    case 'ration': world.resources.food = Math.max(0, (world.resources.food ?? 0) - 5); narrative = 'Supplies are rationed. The tribe endures.'; break;
    case 'dig_wells': world.resources.stone = Math.max(0, (world.resources.stone ?? 0) - 15); popGrowthMod = Math.max(popGrowthMod, 1.2); break;
    case 'migrate': world.resources.food = (world.resources.food ?? 0) + 35; break;
    case 'conserve': world.resources.food = Math.max(0, (world.resources.food ?? 0) - 8); narrative = 'Water is counted drop by drop.'; break;
    case 'quarantine': narrative = 'The sick are isolated. It saves lives.'; break;
    case 'herbs': world.resources.food = Math.max(0, (world.resources.food ?? 0) - 10); narrative = 'Bitter teas dull the fever.'; break;
    case 'prayer': world.resources.food = Math.max(0, (world.resources.food ?? 0) - 20); narrative = 'Dawn brings no answers. Only questions.'; break;
    case 'fight': world.resources.food = (world.resources.food ?? 0) + 10; defenseLevel = Math.max(defenseLevel - 5, 0); break;
    case 'bribe': world.resources.food = Math.max(0, (world.resources.food ?? 0) - 30); world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 20); break;
    case 'hide': world.resources.food = Math.max(0, (world.resources.food ?? 0) - 5); break;
    case 'rebuild': world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 20); world.resources.stone = Math.max(0, (world.resources.stone ?? 0) - 25); defenseLevel += 15; break;
    case 'relocate': world.resources.food = Math.max(0, (world.resources.food ?? 0) - 30); defenseLevel = 0; break;
    case 'repair': world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 8); world.resources.stone = Math.max(0, (world.resources.stone ?? 0) - 5); break;
  }
  return narrative;
}

// ─── Final Report ───────────────────────────────────

function showFinalReport(
  stats: any,
  elapsed: string,
  factions: { name: string; influence: number; color: string }[],
  agents: { name: string; archetype: string }[],
  legacy: any,
): void {
  clearScreen();
  console.log(`\n  ${GOLD}${B}★★★★★ THE SCROLL IS CLOSED ★★★★★${R}`);
  console.log();

  const winEmoji = stats.population >= 80 ? '🏆' : '💀';
  console.log(`  ${winEmoji}  ${B}${stats.population >= 80 ? 'YOUR CIVILIZATION ENDURES' : 'THE TRIBE HAS FALLEN'}${R}\n`);

  const legends = legacy.getLegends();
  if (legends.length > 0) {
    console.log(`  ${GOLD}★ LEGENDS${R}`);
    for (const l of legends.slice(0, 4)) {
      const deeds = l.deeds.length > 0 ? l.deeds.join(', ') : 'Survived';
      console.log(`  ${D}◆${R} ${l.name} ${D}the ${l.archetype}${R} — ${GY}${deeds}${R}`);
    }
    console.log();
  }

  console.log(`  ${GY}Epochs${R}  ${stats.currentEpoch}   ${GY}Era${R}  ${YEL}${stats.era}${R}   ${GY}Pop${R}  ${stats.population}   ${GY}Disc${R}  ${allDisc.length}   ${GY}Hyp${R}  ${stats.totalHypotheses}`);
  console.log(`  ${GY}Raids${R}  ${totalRaidsSurvived}   ${GY}Decisions${R}  ${playerChoices.length}   ${GY}Achievements${R}  ${YEL}${achieved.size}${R}   ${GY}Time${R}  ${elapsed}s`);
  console.log();

  if (allDisc.length > 0) {
    console.log(`  ${GOLD}✦ DISCOVERIES${R}`);
    const cols = 3;
    for (let i = 0; i < allDisc.length; i += cols) {
      const row = allDisc.slice(i, i + cols).map(d => `${GRN}✦${R}${d.substring(0, 18)}`).join('  ');
      console.log(`  ${row}`);
    }
    console.log();
  }

  if (achieved.size > 0) {
    const names: Record<string, string> = {
      'first_disc': 'First Light', 'hyp_10': 'Big Thinkers', 'hyp_25': 'Think Tank',
      'disc_5': 'Enlightened', 'disc_10': 'Golden Age', 'pop_100': 'Village',
      'pop_200': 'Town', 'survive_5_raids': 'Unbowed', 'era_advance': 'Age Up!',
      'food_500': 'Breadbasket',
    };
    const list = [...achieved].map(id => names[id]).filter(Boolean).join(', ');
    console.log(`  ${GOLD}★ ACHIEVEMENTS${R}  ${D}${list}${R}`);
    console.log();
  }

  if (playerChoices.length > 0) {
    console.log(`  ${GOLD}★ YOUR DECISIONS${R}`);
    for (const c of playerChoices) console.log(`  ${D}▸${R} ${c}`);
    console.log();
  }
}

// ─── Main Game Loop ─────────────────────────────────

async function playGame(scenarioId: string, epochCount: number, agentCount?: number): Promise<void> {
  const config = loadConfig();
  const llm = createProvider();

  const isLarge = agentCount != null && agentCount > 0;
  const scenario = isLarge
    ? generateLargeScenario(agentCount!)
    : getScenario(scenarioId) ?? SCENARIOS[0]!;

  gameSession = createGameSession(scenarioId, epochCount, scenario.agents as any, scenario.worldState as any);
  cascadeEngine = new EventCascadeEngine();
  const { agentManager, factionManager, enemyManager, legacy, civManager, religionManager, historyBook, dynastySystem } = gameSession;
  const allAgents = agentManager.getAllAgents();
  const allFactions = factionManager.getAllFactions();

  const worldState: WorldState = { ...gameSession.worldState };
  let worldMap = gameSession.worldMap;
  const orchestrator = new Orchestrator(config, llm, agentManager, worldState);
  const op = orchestrator as any;
  let lastStoryEpoch = 0;
  let eraAdvancements = 0;
  let consecutiveDrought = 0;

  const origInfo = console.info, origWarn = console.warn;
  console.info = () => {}; console.warn = () => {};
  logger.info = () => {}; logger.warn = () => {};

  op.running = true;

  // ── Intro ──
  clearScreen();
  console.log(`\n  ${GOLD}${B}✦ ${scenario.name}${R}`);
  console.log(`  ${GY}${scenario.description || ''}${R}`);
  const agentCountDisplay = scenario.agents.length;
  console.log(`  ${D}${agentCountDisplay} agents · ${epochCount} years · ${scenario.difficulty}${R}\n`);
  if (agentCountDisplay <= 10) {
    for (const a of scenario.agents) {
      console.log(`  ${D}◆${R} ${B}${a.name}${R} ${D}${a.archetype}${R}${a.expertiseDescription ? ` — ${a.expertiseDescription}` : ''}`);
      await sleep(150);
    }
  } else {
    const archCounts = new Map<string, number>();
    for (const a of scenario.agents) {
      archCounts.set(a.archetype, (archCounts.get(a.archetype) ?? 0) + 1);
    }
    const archSummary = [...archCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([arch, count]) => `${count}x ${arch}`)
      .join(', ');
    console.log(`  ${GY}{${agentCountDisplay} inhabitants: ${archSummary}}${R}`);
    await sleep(500);
  }
  console.log(`\n  ${D}The chronicle begins...${R}`);
  await sleep(800);

  const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

  // ── Epoch Loop ──
  for (let e = 1; e <= epochCount; e++) {
    if (!op.running) break;

    // ── Run Orchestrator (once per epoch, core simulation) ──
    const beforeDisc = op.worldState.discoveries.length;
    const beforeEra = worldState.era;
    op.epochEvents = [];
    const origPush = op.epochEvents.push.bind(op.epochEvents);
    op.epochEvents.push = (evt: any) => {
      const d = evt.description ?? evt.type ?? String(evt);
      return origPush(evt);
    };

    await withSpinner(() => op.runEpoch());

    const stats = orchestrator.getStats();

    // ── Tick GameSession (once per epoch) ──
    const sessionEvents = tickSession(gameSession!, orchestrator, e);
    for (const se of sessionEvents) gameSession!.allEvents.push(se);

    // ── Process enemy raids ──
    for (const re of enemyManager.tick(e, stats.population, defenseLevel)) {
      if (!gameSession!.allEvents.includes(re)) {
        gameSession!.allEvents.push(re);
        if (/raided|attacked|raid/i.test(re)) {
          totalRaidsSurvived++;
          alarm();
          const dmgMatch = re.match(/Lost (\d+)/);
          const dmg = dmgMatch ? parseInt(dmgMatch[1]!, 10) : 3;
          const survived = dmg < stats.population * 0.4;
          const defender = allAgents.find(a => a.archetype === 'warrior' || a.archetype === 'leader');
          const log = combatLog('Grey Wolves', dmg, survived, defender?.name);
          for (const l of log) console.log(`  ${l}`);
          await sleep(400);
        }
      }
    }

    // ── Era check ──
    if (worldState.era !== beforeEra) {
      eraAdvancements++;
      fanfare();
      const newsBody = [`The civilization enters a new age: ${worldState.era}.`, 'New possibilities open up.'];
      await showFullScreenPopup('era', `ERA ADVANCEMENT: ${worldState.era}`, newsBody, { era: 1 });
    }

    // ── New discoveries ──
    const newDiscs = op.worldState.discoveries.slice(beforeDisc);
    for (const d of newDiscs) {
      if (!allDisc.includes(d.title)) {
        allDisc.push(d.title);
        fanfare();
        const quotableAgent = allAgents[Math.floor(Math.random() * allAgents.length)];
        const quote = quotableAgent ? getAgentQuote(quotableAgent.name, quotableAgent.archetype) : '';
        await showFullScreenPopup('discovery', `${d.title} DISCOVERED!`, [d.description ?? '', quote ? `"${quote}"` : ''].filter(Boolean));
      }
    }
    if (discoveryBoost > 0 && newDiscs.length > 0) discoveryBoost = Math.max(0, discoveryBoost - 1);

    // ── Mid-epoch player action (once per year) ──
    const action = await midEpochAction(allAgents.map(a => ({ name: a.name, archetype: a.archetype, id: a.id })), gameSession ?? undefined);
    if (action === 'decree') {
      const choices = getCouncilChoices(worldState as any, factionManager.getAllFactions(), enemyManager.getAll());
      if (choices.length > 0) {
        const chosen = await councilPrompt(choices, worldState as any, stats.population);
        if (chosen !== 'custom') {
          applyCouncilEffect(chosen, worldState, enemyManager);
          const found = choices.find(c => c.id === chosen);
          if (found) gameSession!.allEvents.push(`📜 Council: ${found.effect.narrative}`);
        }
      }
    }

    // ── 4-Season Micro-Loop ──
    for (let s = 0; s < 4; s++) {
      const season = SEASON_ORDER[s]!;
      const weather = generateWeather(e * 4 + s);
      const wfx = applyWeatherToResources(worldState.resources as any, weather);
      worldState.resources = wfx.resources as any;
      for (const wc of wfx.changes) gameSession!.allEvents.push(wc);

      const isDrought = getSeasonDrought(weather);
      if (isDrought) consecutiveDrought++;
      else consecutiveDrought = Math.max(0, consecutiveDrought - 1);

      // Event cascade
      if (cascadeEngine) {
        const cascadeEvents = cascadeEngine.tick({
          epoch: e, season, events: gameSession!.allEvents.slice(-10),
          activeCascades: [], resources: worldState.resources as any,
          agents: allAgents, population: stats.population, defenseLevel,
        });
        for (const ce of cascadeEvents) gameSession!.allEvents.push(ce);
      }

      // Agent chatter (mid-season)
      if (allAgents.length >= 2 && Math.random() < 0.4) {
        const chatterLines = generateChatter(allAgents, {
          recentEvents: gameSession!.allEvents.slice(-5),
          currentEra: worldState.era,
          resources: worldState.resources as any,
        });
        displayChatterBox(chatterLines);
        await sleep(300);
      }

      // Dynamic map
      const drought = isDrought || consecutiveDrought > 2;
      const fire = /wildfire|fire/i.test(gameSession!.allEvents.slice(-3).join(' '));
      const deforestVal = gameSession?.climate.deforestation ?? 0;
      const mapStr = renderDynamicMap(worldMap, {
        season, climate: gameSession!.climate,
        drought, fire, defenseLevel, deforestation: deforestVal,
      }, gameSession!.allEvents);

      // Epoch-season display
      const factionState = factionManager.getAllFactions().map(f => ({
        name: f.name, influence: f.influence, color: f.color,
      }));
      const enemyState = enemyManager.getAll().map(en => ({
        name: en.name, hostility: en.hostility,
      }));

      showEpochSeasonal(
        e, epochCount, worldState.era, season,
        stats.population, worldState.resources as any,
        allAgents.map(a => ({ name: a.name, archetype: a.archetype, id: a.id })),
        factionState, enemyState,
        gameSession!.allEvents.slice(-6), mapStr, gameSession ?? undefined,
      );

      checkAchievements({ ...stats, eraAdvancements, totalDiscoveries: allDisc.length });

      // Breaking news for major events
      const recentSlice = gameSession!.allEvents.slice(-3);
      for (const evt of recentSlice) {
        const cat = detectNewsCategory(evt);
        if (cat && Math.random() < 0.3) {
          const headline = evt.substring(0, 50);
          const body = buildNewsBody(evt);
          await showNewsPopup(cat, headline, body);
        }
      }

      await sleep(150);
    }

    // ── End-of-Year ──

    // Record history
    recordHistory(gameSession!, e, gameSession!.allEvents.slice(-5));

    // Newspaper (every 5 years)
    const paper = generateSessionNewspaper(gameSession!, e);
    if (paper) {
      fanfare();
      console.log(`\n  ${PARCH}${B}📰 THE CIVILIZATION TIMES — Year ${e}${R}\n`);
      console.log(printNewspaper(paper));
      await sleep(1500);
    }

    // Council every 4 years (scheduled)
    if (e % 4 === 0 && e < epochCount) {
      const choices = getCouncilChoices(worldState as any, factionManager.getAllFactions(), enemyManager.getAll());
      if (choices.length > 0) {
        const chosen = await councilPrompt(choices, worldState as any, stats.population);
        if (chosen !== 'custom') {
          applyCouncilEffect(chosen, worldState, enemyManager);
          const found = choices.find(c => c.id === chosen);
          if (found) gameSession!.allEvents.push(`📜 Council: ${found.effect.narrative}`);
        }
      }
    }

    // Crisis
    const crisisEvt = gameSession!.allEvents.slice(-3).find(ev => {
      const id = identifyCrisisType(ev);
      return id !== null && Math.random() < 0.6;
    });
    if (crisisEvt) {
      await sleep(200);
      const crisisType = identifyCrisisType(crisisEvt)!;
      const crisisChoices = getCrisisChoices(crisisType);
      if (crisisChoices.length > 0) {
        const chosen = await crisisPrompt(crisisChoices, crisisEvt);
        const narrative = applyCrisisEffect(chosen, worldState);
        if (narrative) gameSession!.allEvents.push(`📜 Response: ${narrative}`);
      }
    }

    // Tech direction
    const techCandidates = getTechChoices(worldState);
    if (techCandidates.length > 1 && allDisc.length > 1 && e % 5 === 1 && e < epochCount) {
      await techPrompt(techCandidates);
    }

    // Update map features
    const discTitles = (worldState.discoveries ?? []).map((d: any) => d.title ?? d);
    updateMapFeatures(worldMap, stats.population, discTitles, e);

    // Win/Lose
    const wl = checkWinLose({
      epoch: e, maxEpochs: epochCount,
      population: stats.population, era: worldState.era,
      discoveries: allDisc.length, totalHypotheses: stats.totalHypotheses,
      resources: worldState.resources as any,
    });
    if (wl.result === 'win' || wl.result === 'loss') {
      if (wl.result === 'win') {
        fanfare();
        flash(' VICTORY! ' + wl.reason, BG_Y, BLK, 1500);
      } else {
        alarm();
        flash(' DEFEAT ' + wl.reason, BG_R, BLK, 1500);
      }
      break;
    }
  }

  // ── End ──
  console.info = origInfo; console.warn = origWarn;

  for (const agent of allAgents) {
    const deeds: string[] = [];
    if (allDisc.length > 0) deeds.push(`Helped discover ${allDisc.length} technologies`);
    if (allFactions.some(f => f.memberIds.includes(agent.id))) deeds.push('Led a faction');
    if (totalRaidsSurvived > 0) deeds.push(`Survived ${totalRaidsSurvived} raids`);
    legacy.recordLegend(agent.name, agent.archetype, deeds, worldState.era, epochCount);
    dynastySystem.recordAchievement(agent, deeds.join(', '));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const finalStats = orchestrator.getStats();
  const ss = getSessionStats(gameSession!, orchestrator);

  // ── End-game chronicles ──
  console.log(`\n  ${PARCH}${B}═══════════════════════════════════════${R}`);
  console.log(`  ${GOLD}${B}  THE CIVILIZATION CHRONICLES${R}`);
  console.log(`  ${PARCH}${B}═══════════════════════════════════════${R}\n`);
  console.log(historyBook.printHistory());

  console.log(`\n  ${GOLD}${B}═══════════════════════════════════════${R}`);
  console.log(`  ${GOLD}${B}  DYNASTIES${R}`);
  console.log(`  ${PARCH}${B}═══════════════════════════════════════${R}\n`);
  console.log(`  ${dynastySystem.getDynastySummary().replace(/\n/g, '\n  ')}`);

  const relSummary = religionManager.getSummary();
  if (relSummary) {
    console.log(`\n  ${MAG}${B}═══════════════════════════════════════${R}`);
    console.log(`  ${MAG}${B}  RELIGIONS & CULTURE${R}`);
    console.log(`  ${PARCH}${B}═══════════════════════════════════════${R}\n`);
    console.log(`  ${relSummary.replace(/\n/g, '\n  ')}`);
  }

  showFinalReport(
    finalStats, elapsed,
    factionManager.getAllFactions().map(f => ({ name: f.name, influence: f.influence, color: f.color })),
    allAgents.map(a => ({ name: a.name, archetype: a.archetype })),
    legacy,
  );
}

// ── Entry ───────────────────────────────────────────

let startTime = Date.now();

async function main(): Promise<void> {
  hideCursor();
  initReadline();

  const { scenarioId, epochs, agentCount } = await pickScenario();
  startTime = Date.now();
  await playGame(scenarioId, epochs, agentCount);

  const again = await ask(`\n  ${CYN}Play again? (y/n):${R} `);
  if (again.trim().toLowerCase() === 'y' || again.trim().toLowerCase() === 'yes') {
    playerChoices = [];
    achieved.clear();
    allDisc.length = 0;
    totalRaidsSurvived = 0;
    defenseLevel = 0;
    discoveryBoost = 0;
    popGrowthMod = 1;
    const { scenarioId: s2, epochs: e2, agentCount: ac2 } = await pickScenario();
    startTime = Date.now();
    await playGame(s2, e2, ac2);
  }

  closeReadline();
  showCursor();
  clearScreen();
  console.log(`  ${GY}The chronicle is closed. Until next time.${R}\n`);
  process.exit(0);
}

main().catch(err => {
  closeReadline();
  showCursor();
  console.error(err);
  process.exit(1);
});
