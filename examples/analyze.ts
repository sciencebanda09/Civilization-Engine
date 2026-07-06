import 'dotenv/config';
import { SCENARIOS, runMultiple, printSummary, logger } from '../src/index.js';

async function main() {
  const args = process.argv.slice(2);
  const scenarioId = args.find(a => !/^\d+$/.test(a)) ?? 'peaceful_valley';
  const runs = parseInt(args.find(a => /^\d+$/.test(a)) ?? '10', 10);
  const epochs = 8;

  const scenario = SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0]!;

  console.clear();
  console.log(`\x1b[33m  ╔═══════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[33m  ║     MULTI-RUN SIMULATION ANALYZER     ║\x1b[0m`);
  console.log(`\x1b[33m  ╚═══════════════════════════════════════╝\x1b[0m`);
  console.log();
  console.log(`  Scenario: \x1b[36m${scenario.name}\x1b[0m  (${scenario.difficulty})`);
  console.log(`  Runs:     \x1b[33m${runs}\x1b[0m`);
  console.log(`  Epochs:   \x1b[33m${epochs}\x1b[0m`);
  console.log(`  Agents:   \x1b[33m${scenario.agents.length}\x1b[0m`);
  console.log();

  const origInfo = console.info;
  const origWarn = console.warn;
  console.info = () => {};
  console.warn = () => {};

  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let si = 0;
  const spinInterval = setInterval(() => {
    process.stdout.write(`\r  ${spinner[si++ % spinner.length]} Running simulations...`);
  }, 100);

  const startTime = Date.now();
  const summary = await runMultiple(scenario, epochs, runs);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  clearInterval(spinInterval);
  process.stdout.write('\r'.repeat(50));
  console.info = origInfo;
  console.warn = origWarn;

  console.clear();
  console.log(printSummary(summary));
  console.log(`  ⏱  Total time: ${elapsed}s  (${(parseFloat(elapsed) / runs).toFixed(1)}s per run)`);
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });
