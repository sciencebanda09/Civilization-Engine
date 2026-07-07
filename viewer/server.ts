import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env['VIEWER_PORT'] ?? '3030', 10);
const SAVES_DIR = join(process.cwd(), 'saves');

export function jsonResponse(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function htmlResponse(res: ServerResponse, html: string): void {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function errorResponse(res: ServerResponse, msg: string, status = 500): void {
  jsonResponse(res, { error: msg }, status);
}

interface SaveMeta {
  id: string;
  label: string;
  timestamp: number;
  epoch: number;
  agentCount: number;
  discoveryCount: number;
}

interface CausalEdge {
  from: string;
  to: string;
  type: 'enables' | 'proposes' | 'discovers';
}

interface CausalNode {
  id: string;
  title: string;
  type: 'discovery' | 'hypothesis' | 'epoch';
  epoch: number;
  agents?: string[];
}

export async function findSaves(): Promise<Array<{ id: string; data: any }>> {
  const results: Array<{ id: string; data: any }> = [];

  if (!existsSync(SAVES_DIR)) return results;

  const entries = await readdir(SAVES_DIR, { withFileEncoding: 'utf-8' });

  for (const entry of entries) {
    if (entry === 'chapters') continue;
    const fullPath = join(SAVES_DIR, entry);

    try {
      const entryStat = await stat(fullPath);
      if (entryStat.isDirectory()) {
        const saveFile = join(fullPath, 'save.json');
        if (existsSync(saveFile)) {
          const raw = await readFile(saveFile, 'utf-8');
          const data = JSON.parse(raw);
          results.push({ id: entry, data });
        }
      } else if (entry.endsWith('.json')) {
        const raw = await readFile(fullPath, 'utf-8');
        const data = JSON.parse(raw);
        results.push({ id: entry.replace('.json', ''), data });
      }
    } catch {
      // skip invalid entries
    }
  }

  return results;
}

export function buildSaveMeta(save: { data: any }): SaveMeta {
  const d = save.data;
  return {
    id: save.id,
    label: d.label || save.id,
    timestamp: d.timestamp || 0,
    epoch: d.worldState?.epoch ?? 0,
    agentCount: d.agents?.length ?? 0,
    discoveryCount: d.worldState?.discoveries?.length ?? 0,
  };
}

export function buildTimeline(save: { data: any }): any[] {
  const d = save.data;
  const timeline: any[] = [];

  if (d.history && Array.isArray(d.history)) {
    for (const snap of d.history) {
      timeline.push({
        epoch: snap.epoch,
        era: snap.era,
        resources: snap.worldState?.resources ?? {},
        discoveries: snap.worldState?.discoveries ?? [],
        events: snap.events ?? [],
        population: snap.metadata?.populationEstimate ?? 0,
        agentCount: snap.agents?.length ?? 0,
        hypotheses: snap.activeHypotheses ?? [],
        teams: snap.activeTeams ?? [],
      });
    }
  } else {
    const ws = d.worldState;
    timeline.push({
      epoch: ws?.epoch ?? 0,
      era: ws?.era ?? 'Unknown',
      resources: ws?.resources ?? {},
      discoveries: ws?.discoveries ?? [],
      events: [],
      population: 0,
      agentCount: d.agents?.length ?? 0,
      hypotheses: [],
      teams: [],
    });
  }

  return timeline;
}

export function buildCausalGraph(save: { data: any }): { nodes: CausalNode[]; edges: CausalEdge[] } {
  const nodes: CausalNode[] = [];
  const edges: CausalEdge[] = [];
  const nodeIds = new Set<string>();

  const d = save.data;

  if (d.history && Array.isArray(d.history)) {
    for (const snap of d.history) {
      if (!nodeIds.has(`epoch_${snap.epoch}`)) {
        nodes.push({
          id: `epoch_${snap.epoch}`,
          title: `Epoch ${snap.epoch}: ${snap.era}`,
          type: 'epoch',
          epoch: snap.epoch,
        });
        nodeIds.add(`epoch_${snap.epoch}`);
      }

      for (const disc of snap.worldState?.discoveries ?? []) {
        const discId = `disc_${disc.title?.replace(/\s+/g, '_')}`;
        if (!nodeIds.has(discId)) {
          nodes.push({
            id: discId,
            title: disc.title,
            type: 'discovery',
            epoch: disc.epochDiscovered,
            agents: [],
          });
          nodeIds.add(discId);
        }
        edges.push({
          from: `epoch_${disc.epochDiscovered}`,
          to: discId,
          type: 'discovers',
        });
      }

      for (const hyp of snap.activeHypotheses ?? []) {
        const hypId = `hyp_${hyp.id}`;
        if (!nodeIds.has(hypId)) {
          nodes.push({
            id: hypId,
            title: hyp.title,
            type: 'hypothesis',
            epoch: snap.epoch,
            agents: hyp.proposerId ? [hyp.proposerId] : [],
          });
          nodeIds.add(hypId);
        }
        edges.push({
          from: `epoch_${snap.epoch}`,
          to: hypId,
          type: 'proposes',
        });
      }
    }
  }

  // Add enabled domain edges between discoveries found earlier and later discoveries
  const discByEpoch = new Map<number, any[]>();
  for (const snap of d.history ?? []) {
    for (const disc of snap.worldState?.discoveries ?? []) {
      const ep = disc.epochDiscovered;
      if (!discByEpoch.has(ep)) discByEpoch.set(ep, []);
      discByEpoch.get(ep)!.push(disc);
    }
  }

  // Build "enables" edges: a discovery enables a domain, and later discoveries in those domains are linked
  const enabledDomainsByEpoch = new Map<number, string[]>();
  for (const snap of d.history ?? []) {
    enabledDomainsByEpoch.set(snap.epoch, snap.worldState?.enabledDomains ?? []);
  }

  const discoveredSet = new Set<string>();
  for (const snap of (d.history ?? []).sort((a: any, b: any) => a.epoch - b.epoch)) {
    for (const disc of snap.worldState?.discoveries ?? []) {
      const discId = `disc_${disc.title?.replace(/\s+/g, '_')}`;
      if (!discoveredSet.has(discId)) {
        discoveredSet.add(discId);
        // Link to prior discoveries in domains that this one's domains match
        for (const [priorEpoch, domains] of enabledDomainsByEpoch) {
          if (priorEpoch < disc.epochDiscovered) {
            for (const priorSnap of d.history ?? []) {
              if (priorSnap.epoch === priorEpoch) {
                for (const priorDisc of priorSnap.worldState?.discoveries ?? []) {
                  const priorId = `disc_${priorDisc.title?.replace(/\s+/g, '_')}`;
                  if (priorId !== discId && discoveredSet.has(priorId)) {
                    edges.push({
                      from: priorId,
                      to: discId,
                      type: 'enables',
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return { nodes, edges };
}

export function extractCausalSubgraph(save: { data: any }, question: string): string {
  const graph = buildCausalGraph(save);
  const { nodes, edges } = graph;

  // Filter to finds nodes matching keywords in the question
  const keywords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const relevantIds = new Set<string>();

  for (const node of nodes) {
    const matchTitle = keywords.some(k => node.title.toLowerCase().includes(k));
    const matchType = keywords.some(k => node.type.includes(k));
    if (matchTitle || matchType) {
      relevantIds.add(node.id);
    }
  }

  // If no keyword matches, return last 10 nodes as context
  if (relevantIds.size === 0) {
    const lastNodes = nodes.slice(-10);
    const lastIds = new Set(lastNodes.map(n => n.id));
    const subEdges = edges.filter(e => lastIds.has(e.from) || lastIds.has(e.to));
    return JSON.stringify({
      nodes: lastNodes.slice(0, 15),
      edges: subEdges.slice(0, 30),
    });
  }

  // Expand to include connected nodes
  const expandedIds = new Set(relevantIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (expandedIds.has(edge.from) && !expandedIds.has(edge.to)) {
        expandedIds.add(edge.to);
        changed = true;
      }
      if (expandedIds.has(edge.to) && !expandedIds.has(edge.from)) {
        expandedIds.add(edge.from);
        changed = true;
      }
    }
    if (expandedIds.size > 50) break;
  }

  const filteredNodes = nodes.filter(n => expandedIds.has(n.id)).slice(0, 30);
  const filteredEdges = edges.filter(e => expandedIds.has(e.from) && expandedIds.has(e.to)).slice(0, 60);

  return JSON.stringify({ nodes: filteredNodes, edges: filteredEdges });
}

function handleCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  handleCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  // Serve frontend
  if (path === '/' || path === '/index.html') {
    const htmlPath = join(__dirname, 'index.html');
    try {
      const html = await readFile(htmlPath, 'utf-8');
      htmlResponse(res, html);
    } catch {
      errorResponse(res, 'Frontend not found. Run viewer from project root.', 404);
    }
    return;
  }

  // API: list saves
  if (path === '/api/saves' && req.method === 'GET') {
    const saves = await findSaves();
    const metas = saves.map(s => buildSaveMeta(s));
    jsonResponse(res, { saves: metas });
    return;
  }

  // API: get save detail
  const saveMatch = path.match(/^\/api\/saves\/([^/]+)$/);
  if (saveMatch && req.method === 'GET') {
    const saveId = saveMatch[1]!;
    const saves = await findSaves();
    const save = saves.find(s => s.id === saveId);
    if (!save) {
      errorResponse(res, `Save '${saveId}' not found`, 404);
      return;
    }
    const meta = buildSaveMeta(save);
    const timeline = buildTimeline(save);
    jsonResponse(res, { meta, timeline });
    return;
  }

  // API: get causal graph
  const graphMatch = path.match(/^\/api\/saves\/([^/]+)\/causal-graph$/);
  if (graphMatch && req.method === 'GET') {
    const saveId = graphMatch[1]!;
    const saves = await findSaves();
    const save = saves.find(s => s.id === saveId);
    if (!save) {
      errorResponse(res, `Save '${saveId}' not found`, 404);
      return;
    }
    const graph = buildCausalGraph(save);
    jsonResponse(res, graph);
    return;
  }

  // API: query why
  if (path === '/api/query/why' && req.method === 'POST') {
    const body = await readBody(req);
    const { question, saveId } = body;
    if (!question || !saveId) {
      errorResponse(res, 'Missing question or saveId', 400);
      return;
    }
    const saves = await findSaves();
    const save = saves.find(s => s.id === saveId);
    if (!save) {
      errorResponse(res, `Save '${saveId}' not found`, 404);
      return;
    }

    const subgraph = extractCausalSubgraph(save, question);

    // Use minimal LLM orchestration for the oracle
    const { createProvider, PromptManager, CausalOracle } = await import('../src/index.js');
    const llm = createProvider();
    const prompts = new PromptManager();
    const oracle = new CausalOracle(llm, prompts);

    try {
      const result = await oracle.answer(question, subgraph, '');
      jsonResponse(res, { answer: result.answer, needsClarification: result.needsClarification, clarificationQuestion: result.clarificationQuestion });
    } catch (err) {
      jsonResponse(res, { answer: 'The oracle could not answer that question at this time.', needsClarification: false });
    }
    return;
  }

  // API: query what-if
  if (path === '/api/query/what-if' && req.method === 'POST') {
    const body = await readBody(req);
    const { question, saveId, epoch } = body;
    if (!question || !saveId) {
      errorResponse(res, 'Missing question or saveId', 400);
      return;
    }
    const saves = await findSaves();
    const save = saves.find(s => s.id === saveId);
    if (!save) {
      errorResponse(res, `Save '${saveId}' not found`, 404);
      return;
    }

    const timeline = buildTimeline(save);
    const targetEpoch = epoch ?? (timeline.length > 0 ? timeline[Math.floor(timeline.length / 2)]!.epoch : 1);

    const { createProvider, PromptManager, CounterfactualEngine } = await import('../src/index.js');
    const llm = createProvider();
    const prompts = new PromptManager();
    const counterfactual = new CounterfactualEngine(llm, prompts);

    const worldStateAtEpoch = {
      era: 'Stone Age',
      epoch: targetEpoch,
      resources: {},
      discoveries: [],
      enabledDomains: [],
      populationNote: '',
      flags: {},
    };

    const originalTimeline = JSON.stringify(timeline.slice(0, 20));

    try {
      const injection = await counterfactual.processInjection(question, worldStateAtEpoch);
      if (!injection.injectionConfirmed) {
        jsonResponse(res, { needsClarification: true, clarificationQuestion: injection.clarifyingQuestion ?? 'Could you clarify what exactly should change and at which epoch?' });
        return;
      }
      const projection = await counterfactual.project(injection, originalTimeline, worldStateAtEpoch);
      if (!projection) {
        jsonResponse(res, { error: 'Counterfactual projection failed.' });
        return;
      }
      const narration = await counterfactual.narrate(projection, question);
      jsonResponse(res, { projection, narration });
    } catch (err) {
      jsonResponse(res, { error: String(err) });
    }
    return;
  }

  // Serve static files from viewer/
  const filePath = join(__dirname, path);
  if (existsSync(filePath) && !filePath.includes('..')) {
    try {
      const content = await readFile(filePath);
      const ext = extname(filePath);
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' });
      res.end(content);
    } catch {
      errorResponse(res, 'File not found', 404);
    }
    return;
  }

  errorResponse(res, 'Not found', 404);
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

export function startServer(): void {
  const server = createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`\n  🌐 Civilization Engine Viewer running at http://localhost:${PORT}`);
    console.log(`  📁 Reading saves from: ${SAVES_DIR}`);
    console.log(`  Press Ctrl+C to stop\n`);
  });
}

const isMain = process.argv[1]?.includes('viewer/server');
if (isMain) {
  startServer();
}
