import 'dotenv/config';
import {
  Orchestrator, AgentManager, MockLLMProvider, loadConfig,
  createGameSession, tickSession, recordHistory, generateSessionNewspaper, getSessionStats,
  type GameSession, type ClimateState,
  ReligionManager, CivilizationManager, HistoryBook, DynastySystem,
  personalitySummary, getStance, printNewspaper,
} from '../src/index.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

async function main(): Promise<void> {
  console.log('\n═══ E2E Integration Test ═══\n');

  // ── 1. GameSession creation ──
  console.log('● GameSession creation');
  const agents = [
    { name: 'Luna', archetype: 'scientist' as const, personalityTraits: ['curious', 'methodical'], expertise: ['alchemy', 'astronomy'], expertiseDescription: 'Studies the natural world', goals: ['understand nature'] },
    { name: 'Renn', archetype: 'builder' as const, personalityTraits: ['cautious', 'diligent'], expertise: ['construction', 'stonework'], expertiseDescription: 'Builds structures', goals: ['expand settlement'] },
    { name: 'Ash', archetype: 'warrior' as const, personalityTraits: ['brave', 'loyal'], expertise: ['combat', 'tactics'], expertiseDescription: 'Defends the tribe', goals: ['protect the people'] },
    { name: 'Mira', archetype: 'diplomat' as const, personalityTraits: ['friendly', 'perceptive'], expertise: ['negotiation', 'languages'], expertiseDescription: 'Builds relationships', goals: ['form alliances'] },
  ];

  const initialWorld = {
    resources: { food: 100, wood: 80, stone: 60, iron: 0 },
    era: 'Stone Age',
    discoveries: [{ id: 'basic_toolmaking', title: 'Basic Toolmaking', description: 'Simple stone tools', epochDiscovered: 0, discoveredBy: ['elders'], enabledDomains: ['toolmaking'] }],
    flags: { started: true },
    enabledDomains: [],
    populationNote: '~0 people',
  };

  const session = createGameSession('test', 10, agents, initialWorld as any);
  assert(session.agentManager.count() === 4, '4 agents created');
  assert(session.civManager.getAll().length >= 2, '≥2 autonomous civilizations spawned');
  assert(session.factionManager.getAllFactions().length === 4, '4 factions formed');
  assert(session.enemyManager.getAll().length === 1, '1 enemy tribe spawned');
  assert(session.historyBook.getAll().length === 1, '1 history entry (founding)');
  assert(session.dynastySystem !== undefined, 'DynastySystem initialized');
  assert(session.religionManager !== undefined, 'ReligionManager initialized');
  assert(session.worldMap !== undefined, 'WorldMap generated');
  assert(session.worldState.resources.food === 100, 'Resources preserved');
  assert(session.allDisc.length === 0, 'No discoveries yet');

  // ── 2. Agent Personalities ──
  console.log('\n● Agent Personalities');
  const allAgents = session.agentManager.getAllAgents();
  for (const agent of allAgents) {
    const summary = personalitySummary(agent);
    assert(summary.includes('Age:'), `${agent.name} has age in personality`);
    assert(summary.includes('Trust:'), `${agent.name} has trust in personality`);
    assert(summary.includes('Optimism:'), `${agent.name} has optimism in personality`);
    assert(agent.personality.riskTolerance >= 0 && agent.personality.riskTolerance <= 100, `${agent.name} risk tolerance in range`);
    assert(agent.optimizationTarget.length > 0, `${agent.name} has optimization target`);
  }

  // ── 3. Agent Opinions ──
  console.log('\n● Agent Opinions');
  for (const agent of allAgents) {
    for (const other of allAgents) {
      if (other.id === agent.id) continue;
      const stance = getStance(agent, other.id);
      assert(['ally', 'friendly', 'neutral', 'distrust', 'enemy'].includes(stance), `${agent.name} stance toward ${other.name} is valid`);
    }
  }

  // ── 4. Run simulation with Orchestrator + all systems ──
  console.log('\n● Simulation epochs');
  const config = loadConfig();
  const llm = MockLLMProvider.createDemo();
  const agentManagerCopy = new AgentManager();
  for (const a of agents) agentManagerCopy.createAgent(a);
  const worldState = { ...initialWorld as any, epoch: 0, discoveries: [...initialWorld.discoveries] };
  const orchestrator = new Orchestrator(config, llm, agentManagerCopy, worldState);
  const op = orchestrator as any;
  op.running = true;

  const supress = () => {};
  const origInfo = console.info; console.info = supress;
  const origWarn = console.warn; console.warn = supress;

  for (let e = 1; e <= 10; e++) {
    await op.runEpoch();
    const events = tickSession(session, orchestrator, e);
    session.allEvents.push(...events);
    recordHistory(session, e, session.allEvents.slice(-10));
    session.epoch = e;
  }

  console.info = origInfo; console.warn = origWarn;

  const stats = getSessionStats(session, orchestrator);
  assert(stats.currentEpoch === 10, 'Ran 10 epochs');
  assert(stats.population > 0, 'Population tracked');
  assert(stats.era.length > 0, 'Era tracked');

  // ── 5. HistoryBook ──
  console.log('\n● History Book');
  const allHistory = session.historyBook.getAll();
  assert(allHistory.length >= 1, 'History has at least founding entry');
  assert(allHistory.some(h => h.type === 'founding'), 'Founding entry exists');
  const printedHistory = session.historyBook.printHistory();
  assert(printedHistory.includes('CHRONICLES'), 'History can be printed');

  // ── 6. Newspaper ──
  console.log('\n● Newspaper');
  const paper = generateSessionNewspaper(session, 10);
  if (paper) {
    assert(paper.headline.length > 0, 'Newspaper has headline');
    assert(paper.articles.length > 0, 'Newspaper has articles');
    assert(paper.date.includes('Year 10'), 'Newspaper has correct date');
    const printed = printNewspaper(paper);
    assert(printed.includes('THE CIVILIZATION TIMES'), 'Newspaper prints correctly');
    console.log(`     Headline: "${paper.headline}" (${paper.articles.length} articles)`);
  } else {
    assert(false, 'Newspaper generated at epoch 10');
  }

  // ── 7. Religion ──
  console.log('\n● Religion & Culture');
  session.religionManager.tick(10, session.allEvents, 100);
  const religions = session.religionManager.getReligions();
  const traditions = session.religionManager.getTraditions();
  const relSummary = session.religionManager.getSummary();
  assert(typeof relSummary === 'string', 'Religion summary is a string');
  assert(Array.isArray(religions), 'Religions list is array');
  assert(Array.isArray(traditions), 'Traditions list is array');
  // ── 8. Dynasty ──
  console.log('\n● Dynasty System');
  for (const agent of allAgents) {
    session.dynastySystem.register(agent, 0);
    session.dynastySystem.recordAchievement(agent, `Contributed to ${stats.totalDiscoveries} discoveries`);
  }
  const dynSummary = session.dynastySystem.getDynastySummary();
  assert(dynSummary.length > 0, 'Dynasty summary is non-empty');

  // ── 9. Civilization Diplomacy ──
  console.log('\n● Civilization Diplomacy');
  const allCivs = session.civManager.getAll();
  if (allCivs.length >= 2) {
    const dip = session.civManager.getDiplomacy(allCivs[0]!.id, allCivs[1]!.id);
    assert(dip.relation !== undefined, 'Diplomacy state has relation');
    assert(typeof dip.trust === 'number', 'Diplomacy state has trust');
    assert(typeof dip.espionageLevel === 'number', 'Diplomacy has espionage level');

    const tradeEvents = session.civManager.tradeBetween(allCivs[0]!.id, allCivs[1]!.id);
    assert(Array.isArray(tradeEvents), 'Trade returns event array');

    const spyEvents = session.civManager.espionage(allCivs[0]!.id, allCivs[1]!.id);
    assert(Array.isArray(spyEvents), 'Espionage returns event array');
  }

  // ── 10. Climate ──
  console.log('\n● Climate System');
  assert(session.climate.temperature >= 0, 'Temperature tracked');
  assert(session.climate.co2 >= 280, 'CO2 tracked (baseline 280)');
  assert(session.climate.deforestation >= 0, 'Deforestation tracked');
  assert(session.climate.pollution >= 0, 'Pollution tracked');
  assert(session.climate.co2 > 280, 'CO2 increased over 10 epochs (pop growth)');
  assert(session.climate.deforestation > 0, 'Deforestation increased over 10 epochs');

  // ── 11. Agent aging ──
  console.log('\n● Agent Aging');
  for (const agent of session.agentManager.getAllAgents()) {
    assert(agent.personality.age > 20, `${agent.name} aged (start 20+1 per epoch)`);
  }

  // ── Summary ──
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n  ❌ E2E test crashed:', err);
  process.exit(1);
});
