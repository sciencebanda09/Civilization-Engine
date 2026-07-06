import type { Agent, WorldState, Archetype } from '../types/index.js';
import { AgentManager, type AgentCreateParams } from '../agents/agent-manager.js';
import { FactionManager } from '../factions/faction-manager.js';
import { EnemyManager } from '../world/enemy-tribes.js';
import { CivilizationManager, type AutonomousCivilization } from '../world/civilization.js';
import { ReligionManager } from '../world/religion.js';
import { HistoryBook } from '../narrative/history-book.js';
import { generateNewspaper, printNewspaper, type Newspaper } from '../narrative/newspaper.js';
import { DynastySystem } from './dynasty.js';
import { LegacySystem } from './legacy.js';
import { generateWeather, applyWeatherToResources } from '../world/weather.js';
import { generateWorldMap, updateMapFeatures, renderMap, type WorldMap } from '../map/terrain.js';
import { checkWinLose } from './win-conditions.js';

export interface ClimateState {
  temperature: number;
  co2: number;
  deforestation: number;
  pollution: number;
}

export interface GameSessionStats {
  currentEpoch: number;
  population: number;
  era: string;
  totalHypotheses: number;
  totalDiscoveries: number;
  eraAdvancements: number;
}

export interface GameSession {
  agentManager: AgentManager;
  factionManager: FactionManager;
  enemyManager: EnemyManager;
  civManager: CivilizationManager;
  religionManager: ReligionManager;
  historyBook: HistoryBook;
  dynastySystem: DynastySystem;
  legacy: LegacySystem;
  worldState: WorldState;
  worldMap: WorldMap;
  allEvents: string[];
  climate: ClimateState;
  epoch: number;
  maxEpochs: number;
  eraAdvancements: number;
  totalRaidsSurvived: number;
  defenseLevel: number;
  paperInterval: number;
  lastPaperEpoch: number;
  allDisc: string[];
}

export function createGameSession(
  scenarioId: string,
  epochCount: number,
  agents: { name: string; archetype: string; personalityTraits: string[]; expertise: string[]; expertiseDescription: string; goals: string[] }[],
  initialWorldState: WorldState,
): GameSession {
  const agentManager = new AgentManager();
  const factionManager = new FactionManager();
  const enemyManager = new EnemyManager();
  const civManager = new CivilizationManager();
  const religionManager = new ReligionManager();
  const historyBook = new HistoryBook();
  const dynastySystem = new DynastySystem();
  const legacy = new LegacySystem();

  for (const a of agents) {
    const params: AgentCreateParams = {
      name: a.name,
      archetype: a.archetype as Archetype,
      personalityTraits: a.personalityTraits,
      expertise: a.expertise,
      expertiseDescription: a.expertiseDescription,
      goals: a.goals,
    };
    agentManager.createAgent(params);
  }
  const allAgents = agentManager.getAllAgents();

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

  enemyManager.spawn('Grey Wolves', 15 + Math.floor(Math.random() * 10), 20, 6);

  const worldState: WorldState = {
    ...initialWorldState,
    epoch: 0,
    resources: { ...initialWorldState.resources },
    discoveries: initialWorldState.discoveries?.slice() ?? [],
    flags: { ...initialWorldState.flags },
  };

  const worldMap = generateWorldMap(20, 6, Date.now() % 999999, 50);

  for (const agent of allAgents) {
    dynastySystem.register(agent, 0);
  }

  historyBook.record(0, 'The Founding', `The settlement is established. ${allAgents.length} leaders emerge.`, 'founding');

  // Spawn autonomous civilizations at map edges
  const civNames = ['River Valley People', 'Hilltop Kingdom', 'Coastal Traders', 'Desert Nomads'];
  const civTypes: Array<AutonomousCivilization['archetype']> = ['tribal', 'militarist', 'merchant', 'nomad'];
  for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
    const name = civNames[i % civNames.length]!;
    const type = civTypes[i % civTypes.length]!;
    const edge = Math.floor(Math.random() * 4);
    const x = edge === 0 ? 1 : edge === 1 ? 18 : 3 + Math.floor(Math.random() * 14);
    const y = edge === 2 ? 1 : edge === 3 ? 4 : 2 + Math.floor(Math.random() * 3);
    civManager.spawn(name, type, 20 + Math.floor(Math.random() * 30), 5 + Math.random() * 10, x, y, 0);
  }

  return {
    agentManager, factionManager, enemyManager,
    civManager, religionManager, historyBook,
    dynastySystem, legacy, worldState, worldMap,
    allEvents: [], climate: { temperature: 15, co2: 280, deforestation: 0, pollution: 0 },
    epoch: 0, maxEpochs: epochCount, eraAdvancements: 0,
    totalRaidsSurvived: 0, defenseLevel: 0,
    paperInterval: 5, lastPaperEpoch: 0,
    allDisc: [],
  };
}

export function tickSession(session: GameSession, orchestrator: any, epoch: number): string[] {
  const events: string[] = [];

  // Weather
  const weather = generateWeather(epoch);
  const wfx = applyWeatherToResources(session.worldState.resources as any, weather);
  session.worldState.resources = wfx.resources as any;
  for (const wc of wfx.changes) events.push(wc);

  // Faction tick
  for (const fe of session.factionManager.tick(epoch)) events.push(fe);

  // Enemy tick
  for (const re of session.enemyManager.tick(epoch, orchestrator.getStats?.()?.population ?? 50, session.defenseLevel)) {
    events.push(re);
    if (/raided|attacked|raid/i.test(re)) {
      session.totalRaidsSurvived++;
    }
  }

  // Civilization tick
  for (const ce of session.civManager.tick(epoch, 20, 6)) events.push(ce);

  // Trade between civs
  const allCivs = session.civManager.getAll();
  for (let i = 0; i < allCivs.length; i++) {
    for (let j = i + 1; j < allCivs.length; j++) {
      for (const te of session.civManager.tradeBetween(allCivs[i]!.id, allCivs[j]!.id)) events.push(te);
    }
  }

  // Religion tick
  for (const re of session.religionManager.tick(epoch, events, orchestrator.getStats?.()?.population ?? 50)) {
    events.push(re);
  }

  // Climate tick
  const pop = orchestrator.getStats?.()?.population ?? 50;
  session.climate.co2 = Math.min(1000, session.climate.co2 + pop * 0.1);
  session.climate.deforestation = Math.min(100, session.climate.deforestation + pop * 0.05);
  session.climate.pollution = Math.min(100, session.climate.pollution + pop * 0.02);
  session.climate.temperature = 15 + (session.climate.co2 - 280) * 0.01;

  if (session.climate.co2 > 500 && Math.random() < 0.05) {
    events.push(`Climate shift: temperature rises to ${session.climate.temperature.toFixed(1)}°C.`);
  }
  if (session.climate.deforestation > 50 && Math.random() < 0.05) {
    events.push('Deforestation is causing soil erosion around the settlement.');
  }

  // Agent aging
  session.agentManager.ageAllAgents(1);

  return events;
}

export function recordHistory(session: GameSession, epoch: number, recentEvents: string[]): void {
  for (const evt of recentEvents) {
    if (evt.includes('discovered') || evt.includes('Discovered')) {
      session.historyBook.record(epoch, evt.substring(0, 50), evt, 'discovery');
    } else if (evt.includes('famine') || evt.includes('plague') || evt.includes('flood') || evt.includes('drought') || evt.includes('earthquake') || evt.includes('Climate shift')) {
      session.historyBook.record(epoch, evt.substring(0, 50), evt, 'disaster');
    } else if (evt.includes('WAR') || evt.includes('war') || evt.includes('attack') || evt.includes('raid')) {
      session.historyBook.record(epoch, evt.substring(0, 50), evt, 'war');
    } else if (evt.includes('religion') || evt.includes('faith') || evt.includes('tradition') || evt.includes('festival') || evt.includes('Culture')) {
      session.historyBook.record(epoch, evt.substring(0, 50), evt, 'culture');
    }
  }

  if (epoch % 10 === 0) {
    session.historyBook.record(epoch, `Epoch ${epoch} Milestone`, `The civilization reaches year ${epoch}.`, 'milestone');
  }
}

export function generateSessionNewspaper(session: GameSession, epoch: number): Newspaper | null {
  if (epoch < session.lastPaperEpoch + session.paperInterval) return null;

  const allAgents = session.agentManager.getAllAgents();
  const paper = generateNewspaper(
    epoch,
    allAgents,
    session.allEvents.slice(-10),
    session.historyBook.getAll(),
    session.worldState.resources as Record<string, number>,
  );
  session.lastPaperEpoch = epoch;
  return paper;
}

export function getSessionStats(session: GameSession, orchestrator: any): GameSessionStats {
  const stats = orchestrator.getStats?.() ?? {};
  return {
    currentEpoch: session.epoch,
    population: stats.population ?? 50,
    era: session.worldState.era ?? 'Stone Age',
    totalHypotheses: stats.totalHypotheses ?? 0,
    totalDiscoveries: session.allDisc.length,
    eraAdvancements: session.eraAdvancements,
  };
}
