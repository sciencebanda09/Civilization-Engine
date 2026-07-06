import 'dotenv/config';
import {
  Orchestrator, AgentManager, MockLLMProvider, loadConfig,
  createGameSession, tickSession, recordHistory, generateSessionNewspaper, getSessionStats,
  type GameSession, type ClimateState,
  ReligionManager, CivilizationManager, HistoryBook, DynastySystem,
  personalitySummary, getStance, printNewspaper,
  renderDynamicMap, clearFireTiles,
  showNewsPopup, showFullScreenPopup, detectNewsCategory, buildNewsBody,
  generateChatter,
  EventCascadeEngine,
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

  // ── 12. Dynamic Renderer ──
  console.log('\n● Dynamic Map Renderer');
  const mapStr = renderDynamicMap(session.worldMap, {
    season: 'spring', climate: session.climate,
    drought: false, fire: false, defenseLevel: 10, deforestation: 20,
  }, session.allEvents);
  assert(mapStr.includes('+'), 'Dynamic map has border');
  assert(mapStr.includes('SPRING'), 'Dynamic map shows season');
  assert(mapStr.includes('°C'), 'Dynamic map shows temperature');
  clearFireTiles();

  const mapSummer = renderDynamicMap(session.worldMap, {
    season: 'summer', climate: session.climate,
    drought: true, fire: true, defenseLevel: 30, deforestation: 60,
  }, session.allEvents);
  assert(mapSummer.includes('DROUGHT'), 'Dynamic map shows drought warning');
  assert(mapSummer.includes('WILDFIRES'), 'Dynamic map shows fire warning');

  // ── 13. News Popup System ──
  console.log('\n● News Popup System');
  const cat1 = detectNewsCategory('A new discovery changes everything!');
  assert(cat1 === 'discovery', 'Detects discovery category');

  const cat2 = detectNewsCategory('War drums beat on the horizon');
  assert(cat2 === 'war', 'Detects war category');

  const cat3 = detectNewsCategory('Famine strikes the settlement');
  assert(cat3 === 'disaster', 'Detects disaster category');

  const cat4 = detectNewsCategory('A new era begins!');
  assert(cat4 === 'era', 'Detects era category');

  const body = buildNewsBody('A remarkable breakthrough: the tribe discovers how to make fire.');
  assert(body.length > 0, 'News body is non-empty');
  assert(body.some(b => b.length > 0), 'News body has content');

  // ── 14. Chatter Generator ──
  console.log('\n● Agent Chatter');
  const chatterLines = generateChatter(allAgents, {
    recentEvents: session.allEvents.slice(-5),
    currentEra: 'Stone Age',
    resources: { food: 100, wood: 50, stone: 30 },
  });
  assert(chatterLines.length > 0, 'Chatter generates lines');
  assert(chatterLines[0]!.agentName.length > 0, 'Chatter has speaker name');
  assert(chatterLines[0]!.text.length > 0, 'Chatter has text');
  assert(chatterLines[0]!.emotion.length > 0, 'Chatter has emotion');

  // ── 15. Event Cascade Engine ──
  console.log('\n● Event Cascade Engine');
  const cascade = new EventCascadeEngine();
  const cascadeState = {
    epoch: 5, season: 'summer',
    events: ['drought is severe', 'no rain for weeks'],
    activeCascades: [],
    resources: { food: 20, wood: 50, stone: 30 },
    agents: allAgents,
    population: 50,
    defenseLevel: 5,
  };
  const cascadeResults = cascade.tick(cascadeState);
  assert(cascadeResults.length >= 0, 'Cascade returns events array');
  const narratives = cascade.getActiveNarratives();
  assert(Array.isArray(narratives), 'Cascade narratives is array');

  // ── 15b. Cascade with empty events ──
  const emptyCascade = new EventCascadeEngine();
  const emptyResult = emptyCascade.tick({
    ...cascadeState, events: [], resources: { food: 100, wood: 100, stone: 100 },
  });
  assert(emptyResult.length === 0, 'Empty cascade produces no events');

  // ── 16. Personality with trauma ──
  console.log('\n● Personality Trauma');
  for (const agent of allAgents) {
    const beforeOpt = agent.personality.optimism;
    agent.personality.trauma.push('test_trauma');
    assert(agent.personality.trauma.includes('test_trauma'), `${agent.name} trauma recorded`);
  }

  // ── Summary ──
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n  ❌ E2E test crashed:', err);
  process.exit(1);
});
