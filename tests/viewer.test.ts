import 'dotenv/config';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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

const TEST_SAVES_DIR = join(process.cwd(), 'saves', '_viewer_test');

function makeMockSave(epochs: number) {
  const discoveries: Array<{ title: string; description: string; epochDiscovered: number }> = [];
  const history: any[] = [];

  for (let e = 1; e <= epochs; e++) {
    const disc = e % 3 === 0
      ? { title: `Discovery_${e}`, description: `Test discovery at epoch ${e}`, epochDiscovered: e }
      : null;
    if (disc) discoveries.push(disc);

    history.push({
      epoch: e,
      era: e < 3 ? 'Stone Age' : e < 7 ? 'Bronze Age' : 'Iron Age',
      worldState: {
        era: e < 3 ? 'Stone Age' : e < 7 ? 'Bronze Age' : 'Iron Age',
        epoch: e,
        resources: { food: 100 + e * 10, wood: 50 + e * 5, stone: 30 + e * 3 },
        discoveries: [...discoveries],
        enabledDomains: ['basic_toolmaking', ...(e >= 5 ? ['advanced_toolmaking'] : [])],
        populationNote: `~${50 + e * 5} people`,
      },
      agents: [
        { id: `agent_1`, name: 'Test Agent', archetype: 'scientist', expertise: ['alchemy'], status: 'idle', memoryCount: 2, relationships: {} },
      ],
      activeHypotheses: e % 4 === 0 ? [
        { id: `hyp_${e}`, title: `Hypothesis ${e}`, proposerId: 'agent_1', status: 'proposed', difficulty: 'medium' },
      ] : [],
      activeTeams: [],
      events: e % 2 === 0 ? [`Event at epoch ${e}: something happened`] : [],
      metadata: {
        timestamp: Date.now(),
        populationEstimate: 50 + e * 5,
        currentEra: e < 3 ? 'Stone Age' : e < 7 ? 'Bronze Age' : 'Iron Age',
        totalDiscoveries: discoveries.length,
      },
    });
  }

  return {
    version: 1,
    timestamp: Date.now(),
    label: 'Viewer Test Save',
    config: {
      simulation: { maxEpochs: 100, agentsPerEpochActive: 5, maxActiveTeamsPerEpoch: 3 },
    },
    worldState: {
      era: 'Bronze Age',
      epoch: epochs,
      resources: { food: 200, wood: 100, stone: 60 },
      discoveries,
      enabledDomains: ['basic_toolmaking'],
      populationNote: '~80 people',
      flags: {},
    },
    agents: [
      { id: 'agent_1', name: 'Test Agent', archetype: 'scientist', personalityTraits: ['curious'], expertise: ['alchemy'], expertiseDescription: 'Studying alchemy', goals: ['Discover secrets'], relationshipSummary: 'Friendly', status: 'idle', memoryDigest: '', memories: [], personality: {} as any, opinions: {} as any, visibleResources: null, visibleDiscoveries: [], visibleEnemies: [], optimizationTarget: 'discovery' },
    ],
    history,
    rngSeed: 42,
  };
}

async function main(): Promise<void> {
  console.log('\n═══ Viewer / Timeline Tests ═══\n');

  // ── 1. Test save file creation ──
  console.log('● Save file reading');
  const saveDir = join(TEST_SAVES_DIR, 'slot_1');
  if (!existsSync(TEST_SAVES_DIR)) {
    await mkdir(TEST_SAVES_DIR, { recursive: true });
  }
  if (!existsSync(saveDir)) {
    await mkdir(saveDir, { recursive: true });
  }

  const saveData = makeMockSave(12);
  await writeFile(join(saveDir, 'save.json'), JSON.stringify(saveData, null, 2));

  assert(existsSync(join(saveDir, 'save.json')), 'Test save file created');

  // ── 2. Test the server endpoints via dynamic import ──
  console.log('\n● Causal graph builder');
  const { buildCausalGraph, buildTimeline, buildSaveMeta } = await import('../viewer/server.js') as any;

  const saveForTest = { id: 'slot_1', data: saveData };
  const meta = buildSaveMeta(saveForTest);
  assert(meta.epoch === 12, `Meta epoch = ${meta.epoch} (expected 12)`);
  assert(meta.id === 'slot_1', 'Meta id is slot_1');
  assert(meta.discoveryCount === 4, `Meta discoveryCount = ${meta.discoveryCount} (expected 4)`);

  const timeline = buildTimeline(saveForTest);
  assert(timeline.length === 12, `Timeline has ${timeline.length} epochs (expected 12)`);
  assert(timeline[0]!.era === 'Stone Age', 'First epoch is Stone Age');
  assert(timeline[3]!.era === 'Bronze Age', 'Fourth epoch is Bronze Age');
  assert(timeline[2]!.discoveries.length === 1, 'Epoch 3 has 1 discovery');
  assert(timeline[3]!.hypotheses.length === 1, 'Epoch 4 has 1 hypothesis');

  const graph = buildCausalGraph(saveForTest);
  assert(graph.nodes.length > 0, 'Causal graph has nodes');
  assert(graph.edges.length > 0, 'Causal graph has edges');

  // Check that discovery nodes exist
  const discoveryNodes = graph.nodes.filter(n => n.type === 'discovery');
  assert(discoveryNodes.length === 4, `Found ${discoveryNodes.length} discovery nodes (expected 4)`);

  const epochNodes = graph.nodes.filter(n => n.type === 'epoch');
  assert(epochNodes.length === 12, `Found ${epochNodes.length} epoch nodes (expected 12)`);

  const hypothesisNodes = graph.nodes.filter(n => n.type === 'hypothesis');
  assert(hypothesisNodes.length === 3, `Found ${hypothesisNodes.length} hypothesis nodes (expected 3, epochs 4,8,12)`);

  // Check edges exist from epoch to discovery
  const discoverEdges = graph.edges.filter(e => e.type === 'discovers');
  assert(discoverEdges.length >= 4, `At least 4 discover edges (got ${discoverEdges.length})`);

  // ── 3. Test server startup ──
  console.log('\n● Server startup');
  const { startServer } = await import('../viewer/server.js') as any;
  assert(typeof startServer === 'function', 'startServer function exported');
  // Don't actually start the server in tests, just verify it can be started

  // ── 4. Test extractCausalSubgraph ──
  console.log('\n● Causal subgraph extraction');
  const { extractCausalSubgraph } = await import('../viewer/server.js') as any;
  const subgraph = extractCausalSubgraph(saveForTest, 'why did Discovery_3 happen?');
  const parsed = JSON.parse(subgraph);
  assert(parsed.nodes !== undefined, 'Subgraph has nodes');
  assert(parsed.edges !== undefined, 'Subgraph has edges');

  // ── Cleanup ──
  await rm(TEST_SAVES_DIR, { recursive: true, force: true });

  console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n  ❌ Viewer test crashed:', err);
  process.exit(1);
});
