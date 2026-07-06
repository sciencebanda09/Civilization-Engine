import 'dotenv/config';
import * as readline from 'node:readline';
import {
  Orchestrator, AgentManager, createProvider, loadConfig,
  SCENARIOS, getScenario, generateWorldMap, updateMapFeatures, renderMap,
  FactionManager, EnemyManager, checkWinLose, LegacySystem,
  generateWeather, applyWeatherToResources,
  getRandomCitizenStory, getAgentQuote,
  logger,
} from '../src/index.js';
import type { WorldState } from '../src/types/index.js';
import {
  R, B, D, I, RED, GRN, YEL, BLU, MAG, CYN, W, GY, ORG, GOLD, PARCH, BLK,
  BG_R, BG_G, BG_Y, BG_B, BG_M, BG_C, BG_W, BG_K,
  clearScreen, hideCursor, showCursor, flash,
  startSpinner, stopSpinner, enemyTaunt, combatLog, TITLE_ART,
} from '../src/ui/ansi.js';
import {
  getCouncilChoices, getCrisisChoices, getTechChoices, identifyCrisisType,
} from '../src/game/player-decisions.js';

// ─── Globals ────────────────────────────────────────────

const achieved = new Set<string>();
const allDisc: string[] = [];
let totalRaidsSurvived = 0;
let defenseLevel = 0;
let discoveryBoost = 0;
let popGrowthMod = 1;
let playerChoices: string[] = [];

// ─── Utilities ──────────────────────────────────────────

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

// ─── Spinner with Context ──────────────────────────────

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

// ─── Title Screen ──────────────────────────────────────

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

async function pickScenario(): Promise<{ scenarioId: string; epochs: number }> {
  const args = process.argv.slice(2);
  const argScenario = args.find(a => !/^\d+$/.test(a));
  const argEpochs = parseInt(args.find(a => /^\d+$/.test(a)) ?? '', 10);

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

// ─── Epoch Display ─────────────────────────────────────

function showEpoch(
  e: number, total: number, era: string, season: string,
  pop: number, resources: Record<string, number>,
  agents: { name: string; archetype: string }[],
  factions: { name: string; influence: number; color: string }[],
  enemies: { name: string; hostility: number }[],
  events: string[],
  mapStr: string,
): void {
  clearScreen();
  const seasonEmoji: Record<string, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
  const se = seasonEmoji[season.toLowerCase()] || '';
  const pct = Math.round((e / total) * 100);

  // ── Header bar ──
  console.log(`  ${GOLD}${B}✦ YEAR ${e}/${total}${R}  ${YEL}${era}${R}  ${se}${CYN}${season.toUpperCase()}${R}  ${GY}Pop${R} ${pop}  ${GY}Disc${R} ${allDisc.length}  ${D}${'█'.repeat(Math.floor(pct / 4))}${'░'.repeat(25 - Math.floor(pct / 4))}${R}`);
  console.log();

  // ── Agents ──
  const agLine = agents.map(a => `${GY}${a.name}${R}${D} ${a.archetype.charAt(0)}${R}`).join(' · ');
  console.log(`  ${agLine}`);
  console.log();

  // ── Resources (2 per row) ──
  const maxR = Math.max(100, ...Object.values(resources));
  const resColors: Record<string, string> = { food: GRN, wood: YEL, stone: GY };
  const resIcons: Record<string, string> = { food: '🌾', wood: '🪵', stone: '🪨' };
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

  // ── Factions + Enemies ──
  const fLine = factions.map(f => `${f.color}◆${R}${f.name} ${GY}${f.influence}${R}`).join(' ');
  console.log(`  ${fLine}`);
  if (enemies.length > 0) {
    console.log(`  ${RED}⚠${R} ${enemies.map(e => `${e.name} ${GY}${e.hostility}%${R}`).join(' · ')}  ${GY}🛡${R} ${defenseLevel}`);
  }
  console.log();

  // ── Events (last 4, condensed) ──
  const shown = events.slice(-4);
  for (const evt of shown) {
    if (evt.includes('[story]')) {
      console.log(`  ${D}📖 ${evt.replace('[story] ', '').substring(0, 65)}${R}`);
      continue;
    }
    let prefix = '·', col = GY;
    if (/discov|breakthrough|discover/i.test(evt)) { prefix = '✦'; col = GRN; }
    else if (/catastrophe|starv|famine|flood|drought|plague|earthquake/i.test(evt)) { prefix = '💀'; col = RED; }
    else if (/raid|attack|enemy|ambush/i.test(evt)) { prefix = '⚔'; col = RED; }
    else if (/hypothesis|proposed|question/i.test(evt)) { prefix = '○'; col = MAG; }
    else if (/era|advance|progress/i.test(evt)) { prefix = '◆'; col = YEL; }
    console.log(`  ${col}${prefix}${R} ${evt.substring(0, 68)}`);
  }

  // ── Map (compact: first 3 rows) ──
  const mapLines = mapStr.split('\n');
  const body = mapLines.slice(2, -2);
  if (body.length > 0) {
    console.log();
    for (const ml of body.slice(0, 3)) console.log(`  ${D}${ml}${R}`);
  }
}

// ── Decision Prompts ───────────────────────────────────

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

// ── Achievements ───────────────────────────────────────

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

// ── Final Report ───────────────────────────────────────

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

// ── Apply Player Effects ───────────────────────────────

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
    case 'fish':
      world.resources.food = (world.resources.food ?? 0) + 50;
      break;
    case 'forage':
      world.resources.food = (world.resources.food ?? 0) + 25;
      world.resources.wood = (world.resources.wood ?? 0) + 15;
      break;
    case 'ration':
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 5);
      narrative = 'Supplies are rationed. The tribe endures.';
      break;
    case 'dig_wells':
      world.resources.stone = Math.max(0, (world.resources.stone ?? 0) - 15);
      popGrowthMod = Math.max(popGrowthMod, 1.2);
      break;
    case 'migrate':
      world.resources.food = (world.resources.food ?? 0) + 35;
      break;
    case 'conserve':
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 8);
      narrative = 'Water is counted drop by drop.';
      break;
    case 'quarantine':
      narrative = 'The sick are isolated. It saves lives.';
      break;
    case 'herbs':
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 10);
      narrative = 'Bitter teas dull the fever.';
      break;
    case 'prayer':
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 20);
      narrative = 'Dawn brings no answers. Only questions.';
      break;
    case 'fight':
      world.resources.food = (world.resources.food ?? 0) + 10;
      defenseLevel = Math.max(defenseLevel - 5, 0);
      break;
    case 'bribe':
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 30);
      world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 20);
      break;
    case 'hide':
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 5);
      break;
    case 'rebuild':
      world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 20);
      world.resources.stone = Math.max(0, (world.resources.stone ?? 0) - 25);
      defenseLevel += 15;
      break;
    case 'relocate':
      world.resources.food = Math.max(0, (world.resources.food ?? 0) - 30);
      defenseLevel = 0;
      break;
    case 'repair':
      world.resources.wood = Math.max(0, (world.resources.wood ?? 0) - 8);
      world.resources.stone = Math.max(0, (world.resources.stone ?? 0) - 5);
      break;
  }
  return narrative;
}

// ── Main Game Loop ─────────────────────────────────────

async function playGame(scenarioId: string, epochCount: number): Promise<void> {
  const config = loadConfig();
  const llm = createProvider();
  const agentManager = new AgentManager();
  const factionManager = new FactionManager();
  const enemyManager = new EnemyManager();
  const legacy = new LegacySystem();
  const scenario = getScenario(scenarioId) ?? SCENARIOS[0]!;

  // Create agents
  for (const a of scenario.agents) agentManager.createAgent(a as any);
  const allAgents = agentManager.getAllAgents();

  // Form initial factions
  const fColors = ['\x1b[36m', '\x1b[35m', '\x1b[33m', '\x1b[32m'];
  const fNames = ['Innovators', 'Scholars', 'Explorers', 'Builders'];
  for (let i = 0; i < allAgents.length; i++) {
    const agent = allAgents[i]!;
    if (!factionManager.getAgentFaction(agent.id)) {
      factionManager.createFaction(
        `${fNames[i % fNames.length]!} Clan`,
        fColors[i % fColors.length]!,
        agent, 0,
        agent.personalityTraits ?? ['curiosity'],
      );
    }
  }
  const allFactions = factionManager.getAllFactions();
  if (allFactions.length >= 2)
    factionManager.setRivalry(allFactions[0]!.id, allFactions[allFactions.length - 1]!.id);

  // Spawn enemy
  enemyManager.spawn('Grey Wolves', 15 + Math.floor(Math.random() * 10));

  // World state
  const worldState: WorldState = {
    ...scenario.worldState,
    epoch: 0,
    resources: { ...scenario.worldState.resources },
    discoveries: scenario.worldState.discoveries?.slice() ?? [],
    flags: { ...scenario.worldState.flags },
  };

  let worldMap = generateWorldMap(20, 6, Date.now() % 999999, 50);
  const orchestrator = new Orchestrator(config, llm, agentManager, worldState);
  const op = orchestrator as any;
  let currentWeather = generateWeather(0);
  const allEvents: string[] = [];
  let lastStoryEpoch = 0;
  let eraAdvancements = 0;

  // Suppress logging noise
  const origInfo = console.info, origWarn = console.warn;
  console.info = () => {}; console.warn = () => {};
  logger.info = () => {}; logger.warn = () => {};

  op.running = true;

  // ── Intro ──
  clearScreen();
  console.log(`\n  ${GOLD}${B}✦ ${scenario.name}${R}`);
  console.log(`  ${GY}${scenario.description || ''}${R}`);
  console.log(`  ${D}${scenario.agents.length} agents · ${epochCount} years · ${scenario.difficulty}${R}\n`);
  for (const a of scenario.agents) {
    console.log(`  ${D}◆${R} ${B}${a.name}${R} ${D}${a.archetype}${R}${a.description ? ` — ${a.description}` : ''}`);
    await sleep(150);
  }
  console.log(`\n  ${D}The chronicle begins...${R}`);
  await sleep(800);

  // ── Epoch Loop ──
  for (let e = 1; e <= epochCount; e++) {
    if (!op.running) break;

    // Weather
    currentWeather = generateWeather(e);
    const wfx = applyWeatherToResources(worldState.resources as any, currentWeather);
    worldState.resources = wfx.resources as any;
    for (const wc of wfx.changes) allEvents.push(wc);

    const beforeDisc = op.worldState.discoveries.length;
    const beforeEra = worldState.era;
    let epochRaw: string[] = [];
    op.epochEvents = [];
    const origPush = op.epochEvents.push.bind(op.epochEvents);
    op.epochEvents.push = (evt: any) => {
      const d = evt.description ?? evt.type ?? String(evt);
      epochRaw.push(d);
      return origPush(evt);
    };

    // ── Run Epoch (with spinner) ──
    await withSpinner(() => op.runEpoch());

    // Faction tick
    for (const fe of factionManager.tick(e)) allEvents.push(fe);

    const stats = orchestrator.getStats();

    // Enemy tick
    for (const re of enemyManager.tick(e, stats.population, defenseLevel)) {
      allEvents.push(re);
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
        // Apply combat effect
        if (survived) {
          // Population hit already accounted for by enemy tick
        }
      }
    }

    // Enemy taunts (random drama)
    if (e > 2 && Math.random() < 0.15) {
      const enemy = enemyManager.getAll()[0];
      if (enemy && enemy.hostility > 30) {
        allEvents.push(`[story] ${enemyTaunt(enemy.name, enemy.hostility)}`);
      }
    }

    // Citizen stories
    if (e - lastStoryEpoch >= 2 + Math.floor(Math.random() * 2)) {
      allEvents.push(`[story] ${getRandomCitizenStory()}`);
      lastStoryEpoch = e;
    }

    // Era check
    if (worldState.era !== beforeEra) {
      eraAdvancements++;
      fanfare();
      console.log(`\n  ${YEL}${B}🏛️ ERA ADVANCEMENT: ${worldState.era}!${R}\n`);
      await sleep(500);
    }

    // New discoveries
    const newDiscs = op.worldState.discoveries.slice(beforeDisc);
    for (const d of newDiscs) {
      if (!allDisc.includes(d.title)) {
        allDisc.push(d.title);
        fanfare();
        const quote = getAgentQuote(allAgents.map(a => ({ name: a.name, archetype: a.archetype })));
        if (quote) {
          console.log(`\n  ${GRN}${B}✨ ${d.title} DISCOVERED!${R}`);
          console.log(`  ${PARCH}📜 "${quote}"${R}\n`);
        }
        await sleep(300);
      }
    }

    // Apply discovery boost (decays after use)
    if (discoveryBoost > 0 && newDiscs.length > 0) discoveryBoost = Math.max(0, discoveryBoost - 1);

    // Update map
    const discTitles = (worldState.discoveries ?? []).map((d: any) => d.title ?? d);
    updateMapFeatures(worldMap, stats.population, discTitles, e);
    const mapStr = renderMap(worldMap);

    // Win/Lose check
    const wl = checkWinLose({
      epoch: e, maxEpochs: epochCount,
      population: stats.population, era: worldState.era,
      discoveries: allDisc.length, totalHypotheses: stats.totalHypotheses,
      resources: worldState.resources as any,
    });

    // ── Display Epoch ──
    const factionState = factionManager.getAllFactions().map(f => ({
      name: f.name, influence: f.influence, color: f.color,
    }));
    const enemyState = enemyManager.getAll().map(en => ({
      name: en.name, hostility: en.hostility,
    }));

    showEpoch(
      e, epochCount, worldState.era, currentWeather.season,
      stats.population, worldState.resources as any,
      allAgents.map(a => ({ name: a.name, archetype: a.archetype })),
      factionState, enemyState, allEvents.slice(-8), mapStr,
    );

    checkAchievements({ ...stats, eraAdvancements, totalDiscoveries: allDisc.length });

    // ── Interactive Decisions ──

    // Council every 4 epochs
    if (e % 4 === 0 && e < epochCount) {
      const choices = getCouncilChoices(
        worldState as any,
        factionManager.getAllFactions(),
        enemyManager.getAll(),
      );
      if (choices.length > 0) {
        const chosen = await councilPrompt(choices, worldState as any, stats.population);
        if (chosen !== 'custom') {
          applyCouncilEffect(chosen, worldState, enemyManager);
          // Broadcast the narrative
          const found = choices.find(c => c.id === chosen);
          if (found) allEvents.push(`📜 Council: ${found.effect.narrative}`);
        }
      }
    }

    // Crisis (catastrophe in events)
    const crisisEvt = allEvents.slice(-3).find(e => {
      const id = identifyCrisisType(e);
      return id !== null && Math.random() < 0.6;
    });
    if (crisisEvt) {
      await sleep(200);
      const crisisType = identifyCrisisType(crisisEvt)!;
      const crisisChoices = getCrisisChoices(crisisType);
      if (crisisChoices.length > 0) {
        const chosen = await crisisPrompt(crisisChoices, crisisEvt);
        const narrative = applyCrisisEffect(chosen, worldState);
        if (narrative) allEvents.push(`📜 Response: ${narrative}`);
      }
    }

    // Tech direction (when nearing discovery)
    const techCandidates = getTechChoices(worldState);
    if (techCandidates.length > 1 && allDisc.length > 1 && e % 5 === 1 && e < epochCount) {
      const chosenTech = await techPrompt(techCandidates);
      if (chosenTech !== 'skip') {
        // Boost the chosen tech by adding it to discoveries early
        // Simple approach: bias the next discovery toward this tech
      }
    }

    await sleep(80);

    // ── Win/Lose screen ──
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
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const finalStats = orchestrator.getStats();

  showFinalReport(
    finalStats, elapsed,
    factionManager.getAllFactions().map(f => ({ name: f.name, influence: f.influence, color: f.color })),
    allAgents.map(a => ({ name: a.name, archetype: a.archetype })),
    legacy,
  );
}

// ── Entry ──────────────────────────────────────────────

let startTime = Date.now();

async function main(): Promise<void> {
  hideCursor();
  initReadline();

  const { scenarioId, epochs } = await pickScenario();
  startTime = Date.now();
  await playGame(scenarioId, epochs);

  // Play again?
  const again = await ask(`\n  ${CYN}Play again? (y/n):${R} `);
  if (again.trim().toLowerCase() === 'y' || again.trim().toLowerCase() === 'yes') {
    playerChoices = [];
    achieved.clear();
    allDisc.length = 0;
    totalRaidsSurvived = 0;
    defenseLevel = 0;
    discoveryBoost = 0;
    popGrowthMod = 1;
    const { scenarioId: s2, epochs: e2 } = await pickScenario();
    startTime = Date.now();
    await playGame(s2, e2);
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
