import 'dotenv/config';
import {
  Orchestrator, AgentManager, MockLLMProvider, loadConfig,
  createGameSession, generateLargeScenario,
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
  console.log('\n═══ Scale / Large-Population Tests ═══\n');

  // ── 1. Generate large scenario with 50 agents ──
  console.log('● generateLargeScenario(50)');
  const largeScenario = generateLargeScenario(50);
  assert(largeScenario.id === 'large_civilization', 'Scenario ID is large_civilization');
  assert(largeScenario.agents.length === 50, 'Scenario has 50 agents');
  assert(largeScenario.worldState.resources.food === 500, 'Has starting food resources');
  assert(largeScenario.worldState.enabledDomains.includes('basic_toolmaking'), 'Has enabled domains');

  // Check all agents have required fields
  const allArchetypes = new Set(largeScenario.agents.map(a => a.archetype));
  assert(allArchetypes.size >= 10, `Has diverse archetypes (${allArchetypes.size})`);
  for (const agent of largeScenario.agents) {
    assert(agent.name.length > 0, `${agent.archetype} ${agent.name} has a name`);
    assert(agent.expertise.length > 0, `${agent.name} has expertise`);
    assert(agent.personalityTraits.length > 0, `${agent.name} has personality traits`);
    assert(agent.goals.length > 0, `${agent.name} has goals`);
  }

  // ── 2. GameSession with 50 agents ──
  console.log('\n● GameSession with 50 agents');
  const session = createGameSession('large_test', 10, largeScenario.agents as any, largeScenario.worldState as any);
  assert(session.agentManager.count() === 50, '50 agents created');
  const allAgents = session.agentManager.getAllAgents();
  assert(allAgents.length === 50, 'getAllAgents returns 50');

  // Factions should be batched into 4 (not 50)
  const factions = session.factionManager.getAllFactions();
  assert(factions.length === 4, `Only 4 factions for 50 agents, got ${factions.length}`);

  // All agents should be in a faction
  for (const agent of allAgents) {
    const faction = session.factionManager.getAgentFaction(agent.id);
    assert(faction !== undefined, `${agent.name} is in a faction`);
  }

  // Total faction membership should equal total agent count
  const totalMembers = factions.reduce((sum, f) => sum + f.memberIds.length, 0);
  assert(totalMembers === 50, `Total faction membership = ${totalMembers} (expected 50)`);

  // ── 3. Orchestrator with large agent set ──
  console.log('\n● Orchestrator with large agent set');
  const config = loadConfig();
  const llm = MockLLMProvider.createDemo();
  const agentManagerCopy = new AgentManager();
  for (const a of largeScenario.agents) agentManagerCopy.createAgent(a);
  const worldState = { ...largeScenario.worldState as any, epoch: 0, discoveries: [] };
  const orchestrator = new Orchestrator(config, llm, agentManagerCopy, worldState);
  const op = orchestrator as any;
  op.running = true;

  const suppress = () => {};
  const origInfo = console.info; console.info = suppress;
  const origWarn = console.warn; console.warn = suppress;

  for (let e = 1; e <= 5; e++) {
    await op.runEpoch();
  }

  console.info = origInfo; console.warn = origWarn;

  const stats = orchestrator.getStats();
  assert(stats.totalAgents === 50, 'Stats report 50 agents');
  assert(stats.currentEpoch === 5, 'Ran 5 epochs');
  assert(stats.llmCalls >= 0, 'LLM call count is tracked');
  assert(stats.llmCalls <= 50, `LLM calls bounded (${stats.llmCalls})`);
  assert(stats.totalTeams <= config.simulation.maxActiveTeamsPerEpoch * 5,
    `Active teams capped (max ${config.simulation.maxActiveTeamsPerEpoch} per epoch)`);

  // ── 4. AgentsPerEpochActive respects cap ──
  console.log('\n● Agent selection respects active cap');
  const idle = agentManagerCopy.getAgentsByStatus('idle');
  assert(idle.length >= 45, `At least 45 agents remain idle (${idle.length})`);

  // ── 5. generateLargeScenario with different sizes ──
  console.log('\n● generateLargeScenario with varying sizes');
  const small = generateLargeScenario(5);
  assert(small.agents.length === 5, '5 agents generated');

  const medium = generateLargeScenario(30);
  assert(medium.agents.length === 30, '30 agents generated');

  const hundred = generateLargeScenario(100);
  assert(hundred.agents.length === 100, '100 agents generated');

  // ── 6. Config has maxActiveTeamsPerEpoch ──
  console.log('\n● Config has maxActiveTeamsPerEpoch');
  assert(config.simulation.maxActiveTeamsPerEpoch === 3, 'Default maxActiveTeamsPerEpoch = 3');

  // ── Summary ──
  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n  ❌ Scale test crashed:', err);
  process.exit(1);
});
