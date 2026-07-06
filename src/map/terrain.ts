export type TerrainTile = 'water' | 'forest' | 'plains' | 'hills' | 'mountain' | 'desert' | 'swamp';
export type FeatureTile = 'hut' | 'campfire' | 'palisade' | 'farm' | 'mine' | 'tower' | 'none';

export interface MapCell {
  terrain: TerrainTile;
  feature: FeatureTile;
  river: boolean;
  population: number;
}

export interface WorldMap {
  width: number;
  height: number;
  grid: MapCell[][];
  seed: number;
}

const TERRAIN_SYMBOLS: Record<TerrainTile, string> = {
  water: '\x1b[44m \x1b[0m',
  forest: '\x1b[42m \x1b[0m',
  plains: '\x1b[43m \x1b[0m',
  hills: '\x1b[48;5;94m \x1b[0m',
  mountain: '\x1b[47m \x1b[0m',
  desert: '\x1b[48;5;214m \x1b[0m',
  swamp: '\x1b[48;5;22m \x1b[0m',
};

const FEATURE_SYMBOLS: Record<FeatureTile, string> = {
  hut: '\x1b[31m▲\x1b[0m',
  campfire: '\x1b[33m✦\x1b[0m',
  palisade: '\x1b[37m█\x1b[0m',
  farm: '\x1b[32m▓\x1b[0m',
  mine: '\x1b[90m♦\x1b[0m',
  tower: '\x1b[36m♖\x1b[0m',
  none: ' ',
};

let rngState: number;

function seededRandom(seed: number): number {
  rngState = (seed * 16807 + 0) % 2147483647;
  return rngState / 2147483647;
}

function nextRandom(): number {
  rngState = (rngState * 16807) % 2147483647;
  return rngState / 2147483647;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function generateWorldMap(width: number, height: number, seed: number, population: number): WorldMap {
  seededRandom(seed);
  const grid: MapCell[][] = [];

  for (let y = 0; y < height; y++) {
    const row: MapCell[] = [];
    for (let x = 0; x < width; x++) {
      const n = nextRandom();
      let terrain: TerrainTile;
      if (n < 0.15) terrain = 'water';
      else if (n < 0.35) terrain = 'plains';
      else if (n < 0.55) terrain = 'forest';
      else if (n < 0.70) terrain = 'hills';
      else if (n < 0.82) terrain = 'mountain';
      else if (n < 0.92) terrain = 'desert';
      else terrain = 'swamp';

      row.push({ terrain, feature: 'none', river: false, population: 0 });
    }
    grid.push(row);
  }

  // Rivers (simulated): carve a path from top to bottom
  const riverX = Math.floor(nextRandom() * width);
  let rx = riverX;
  for (let y = 0; y < height; y++) {
    if (rx >= 0 && rx < width) {
      grid[y]![rx]!.river = true;
      grid[y]![rx]!.terrain = 'water';
    }
    rx += nextRandom() < 0.4 ? 1 : nextRandom() < 0.4 ? -1 : 0;
  }

  // Place settlement in center
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const settlementRadius = 2;
  for (let dy = -settlementRadius; dy <= settlementRadius; dy++) {
    for (let dx = -settlementRadius; dx <= settlementRadius; dx++) {
      const nx = clamp(cx + dx, 0, width - 1);
      const ny = clamp(cy + dy, 0, height - 1);
      if (grid[ny]![nx]!.terrain === 'water') continue;
      grid[ny]![nx]!.terrain = 'plains';
    }
  }
  grid[cy]![cx]!.feature = 'hut';
  grid[cy]![cx]!.population = population;

  return { width, height, grid, seed };
}

export function updateMapFeatures(map: WorldMap, population: number, discoveries: string[], epoch: number): void {
  const cx = Math.floor(map.width / 2);
  const cy = Math.floor(map.height / 2);

  // Add farms if farming discovered
  if (discoveries.some(d => /farm|agricultur|irrigation/i.test(d))) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = clamp(cx + dx + 1, 0, map.width - 1);
        const ny = clamp(cy + dy + 1, 0, map.height - 1);
        if (map.grid[ny]![nx]!.terrain === 'plains' && map.grid[ny]![nx]!.feature === 'none') {
          map.grid[ny]![nx]!.feature = 'farm';
        }
      }
    }
  }

  // Add palisade if defense discovered
  if (discoveries.some(d => /palisade|defense|fortif|wall/i.test(d))) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) === 2 || Math.abs(dy) === 2) {
          const nx = clamp(cx + dx, 0, map.width - 1);
          const ny = clamp(cy + dy, 0, map.height - 1);
          if (map.grid[ny]![nx]!.feature === 'none') {
            map.grid[ny]![nx]!.feature = 'palisade';
          }
        }
      }
    }
  }

  // More huts = more population
  const huts = Math.min(Math.floor(population / 20), 8);
  for (let i = 0; i < huts; i++) {
    const angle = (i / huts) * Math.PI * 2;
    const dist = 1 + Math.floor(i / 2);
    const hx = clamp(cx + Math.round(Math.cos(angle) * dist), 0, map.width - 1);
    const hy = clamp(cy + Math.round(Math.sin(angle) * dist), 0, map.height - 1);
    if (map.grid[hy]![hx]!.feature === 'none' && map.grid[hy]![hx]!.terrain !== 'water') {
      map.grid[hy]![hx]!.feature = 'hut';
      map.grid[hy]![hx]!.population = Math.floor(population / (huts + 1));
    }
  }

  // Central hut always shows current pop
  map.grid[cy]![cx]!.population = Math.floor(population * 0.3);
}

export function renderMap(map: WorldMap): string {
  const lines: string[] = [];
  const header = `  ${'─'.repeat(map.width * 2 + 2)}`;
  lines.push(header);
  for (const row of map.grid) {
    let line = '  │';
    for (const cell of row) {
      const bg = TERRAIN_SYMBOLS[cell.terrain];
      if (cell.river) {
        line += '\x1b[44m \x1b[0m';
      } else if (cell.feature !== 'none') {
        line += FEATURE_SYMBOLS[cell.feature];
      } else {
        line += bg;
      }
    }
    line += '│';
    lines.push(line);
  }
  lines.push(header);

  // Legend
  const terrainLegend = 'Water🌊 Forest🌲 Plains🌾 Hills⛰️ Mountain🗻 Desert🏜️ Swamp🌿';
  const featureLegend = 'Hut▲ Farm▓ Palisade█ Tower♖';

  return lines.join('\n') + '\n' +
    `  \x1b[90m${terrainLegend}\x1b[0m\n` +
    `  \x1b[90m${featureLegend}\x1b[0m`;
}
