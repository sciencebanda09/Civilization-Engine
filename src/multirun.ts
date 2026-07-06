import type { WorldState } from './types/index.js';
import { Orchestrator } from './simulation/orchestrator.js';
import { AgentManager } from './agents/agent-manager.js';
import { createProvider, loadConfig } from './index.js';
import type { Scenario } from './scenarios/index.js';

export interface RunResult {
  runId: number;
  epochs: number;
  era: string;
  population: number;
  hypotheses: number;
  discoveries: number;
  discoveriesList: string[];
  resources: Record<string, number>;
  duration: string;
}

export interface MultiRunSummary {
  totalRuns: number;
  epochsPerRun: number;
  results: RunResult[];
  avgPopulation: number;
  avgHypotheses: number;
  avgDiscoveries: number;
  maxDiscoveries: number;
  minDiscoveries: number;
  mostCommonEra: string;
  eraDistribution: Record<string, number>;
  topDiscoveries: Array<{ name: string; count: number }>;
}

export async function runMultiple(scenario: Scenario, epochs: number, runs: number): Promise<MultiRunSummary> {
  const results: RunResult[] = [];

  for (let i = 0; i < runs; i++) {
    const config = loadConfig();
    const llm = createProvider();
    const agentManager = new AgentManager();

    for (const a of scenario.agents) {
      agentManager.createAgent(a as any);
    }

    const worldState: WorldState = {
      ...scenario.worldState,
      epoch: 0,
      resources: { ...scenario.worldState.resources },
      discoveries: [],
      flags: { ...scenario.worldState.flags },
    };

    const orchestrator = new Orchestrator(config, llm, agentManager, worldState);
    const startTime = Date.now();
    await orchestrator.run(epochs);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const stats = orchestrator.getStats();

    results.push({
      runId: i + 1,
      epochs: stats.currentEpoch,
      era: stats.era,
      population: stats.population,
      hypotheses: stats.totalHypotheses,
      discoveries: stats.totalDiscoveries,
      discoveriesList: worldState.discoveries.map(d => d.title),
      resources: worldState.resources,
      duration: elapsed,
    });
  }

  return summarize(results, epochs);
}

function summarize(results: RunResult[], epochs: number): MultiRunSummary {
  const n = results.length;
  const avgPop = results.reduce((s, r) => s + r.population, 0) / n;
  const avgHyp = results.reduce((s, r) => s + r.hypotheses, 0) / n;
  const avgDisc = results.reduce((s, r) => s + r.discoveries, 0) / n;
  const maxDisc = Math.max(...results.map(r => r.discoveries));
  const minDisc = Math.min(...results.map(r => r.discoveries));

  const eraDist: Record<string, number> = {};
  for (const r of results) {
    eraDist[r.era] = (eraDist[r.era] ?? 0) + 1;
  }
  const mostCommonEra = Object.entries(eraDist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Stone Age';

  const discCounts: Record<string, number> = {};
  for (const r of results) {
    for (const d of r.discoveriesList) {
      discCounts[d] = (discCounts[d] ?? 0) + 1;
    }
  }
  const topDiscoveries = Object.entries(discCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  return {
    totalRuns: n,
    epochsPerRun: epochs,
    results,
    avgPopulation: Math.round(avgPop),
    avgHypotheses: Math.round(avgHyp * 10) / 10,
    avgDiscoveries: Math.round(avgDisc * 10) / 10,
    maxDiscoveries: maxDisc,
    minDiscoveries: minDisc,
    mostCommonEra,
    eraDistribution: eraDist,
    topDiscoveries,
  };
}

export function printSummary(summary: MultiRunSummary): string {
  const lines: string[] = [];
  lines.push('  ╔═══════════════════════════════════════════╗');
  lines.push('  ║        MULTI-RUN SIMULATION REPORT        ║');
  lines.push('  ╚═══════════════════════════════════════════╝');
  lines.push('');
  lines.push(`  Runs: ${summary.totalRuns}  |  Epochs each: ${summary.epochsPerRun}`);
  lines.push('');
  lines.push(`  📊 Averages:`);
  lines.push(`     Population:  ${summary.avgPopulation}`);
  lines.push(`     Hypotheses:  ${summary.avgHypotheses}`);
  lines.push(`     Discoveries: ${summary.avgDiscoveries}  (range: ${summary.minDiscoveries}–${summary.maxDiscoveries})`);
  lines.push('');
  lines.push(`  🏛 Era Distribution:`);
  for (const [era, count] of Object.entries(summary.eraDistribution).sort((a, b) => b[1] - a[1])) {
    const pct = Math.round((count / summary.totalRuns) * 100);
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    lines.push(`     ${era.padEnd(15)} ${bar} ${pct}% (${count}x)`);
  }
  lines.push('');
  lines.push(`  💡 Most Common Discoveries:`);
  for (const d of summary.topDiscoveries.slice(0, 10)) {
    const pct = Math.round((d.count / summary.totalRuns) * 100);
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    lines.push(`     ${d.name.padEnd(30)} ${bar} ${pct}%`);
  }
  lines.push('');

  return lines.join('\n');
}
