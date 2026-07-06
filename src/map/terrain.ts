export type TerrainTile = 'water' | 'forest' | 'plains' | 'hills' | 'mountain' | 'desert' | 'swamp';
export type FeatureTile = 'hut' | 'campfire' | 'palisade' | 'farm' | 'mine' | 'tower' | 'none' | 'capital' | 'market' | 'barracks' | 'temple' | 'road';

export type ResourceDeposit = 'iron' | 'coal' | 'gold' | 'animals' | 'fish' | 'clay' | 'salt' | 'copper' | 'tin' | 'gems' | 'none';

export interface MapCell {
  terrain: TerrainTile;
  feature: FeatureTile;
  river: boolean;
  population: number;
  resource: ResourceDeposit;
  resourceAmount: number;
  district: string | null;
  road: boolean;
}

export interface City {
  x: number;
  y: number;
  name: string;
  population: number;
  districts: string[];
  walls: number;
  founded: number;
}

export interface WorldMap {
  width: number;
  height: number;
  grid: MapCell[][];
  seed: number;
  cities: City[];
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
  hut: '\x1b[31mH\x1b[0m',
  campfire: '\x1b[33m*\x1b[0m',
  palisade: '\x1b[37mW\x1b[0m',
  farm: '\x1b[32mF\x1b[0m',
  mine: '\x1b[90mM\x1b[0m',
  tower: '\x1b[36mT\x1b[0m',
  none: ' ',
  capital: '\x1b[31mC\x1b[0m',
  market: '\x1b[33mK\x1b[0m',
  barracks: '\x1b[31mB\x1b[0m',
  temple: '\x1b[35mP\x1b[0m',
  road: '\x1b[37m=\x1b[0m',
};

const RESOURCE_SYMBOLS: Record<ResourceDeposit, string> = {
  iron: '\x1b[90mI\x1b[0m',
  coal: '\x1b[30mC\x1b[0m',
  gold: '\x1b[33mG\x1b[0m',
  animals: '\x1b[32mA\x1b[0m',
  fish: '\x1b[36mF\x1b[0m',
  clay: '\x1b[33mC\x1b[0m',
  salt: '\x1b[37mS\x1b[0m',
  copper: '\x1b[33mC\x1b[0m',
  tin: '\x1b[37mT\x1b[0m',
  gems: '\x1b[35mG\x1b[0m',
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

const TERRAIN_RESOURCES: Record<TerrainTile, ResourceDeposit[]> = {
  plains: ['animals', 'clay', 'none', 'none', 'none'],
  forest: ['animals', 'none', 'none', 'none'],
  hills: ['iron', 'copper', 'tin', 'gold', 'gems', 'none', 'none'],
  mountain: ['iron', 'coal', 'gold', 'gems', 'copper', 'tin', 'none'],
  desert: ['salt', 'gold', 'none', 'none'],
  water: ['fish', 'none'],
  swamp: ['clay', 'none'],
};

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

      const pool = TERRAIN_RESOURCES[terrain] ?? ['none'];
      const resource = pool[Math.floor(nextRandom() * pool.length)] ?? 'none';
      const resourceAmount = resource !== 'none' ? Math.floor(20 + nextRandom() * 80) : 0;

      row.push({
        terrain,
        feature: 'none',
        river: false,
        population: 0,
        resource: resource as ResourceDeposit,
        resourceAmount,
        district: null,
        road: false,
      });
    }
    grid.push(row);
  }

  // Rivers: carve a path from top to bottom
  const riverX = Math.floor(nextRandom() * width);
  let rx = riverX;
  for (let y = 0; y < height; y++) {
    if (rx >= 0 && rx < width) {
      grid[y]![rx]!.river = true;
      grid[y]![rx]!.terrain = 'water';
    }
    rx += nextRandom() < 0.4 ? 1 : nextRandom() < 0.4 ? -1 : 0;
  }

  // Place initial settlement
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

  const capital: City = {
    x: cx, y: cy, name: 'Capital',
    population, districts: ['center'],
    walls: 0, founded: 0,
  };

  grid[cy]![cx]!.feature = 'capital';
  grid[cy]![cx]!.population = population;
  grid[cy]![cx]!.district = 'center';

  return { width, height, grid, seed, cities: [capital] };
}

export function expandCity(map: WorldMap, cityIndex: number, epoch: number): void {
  const city = map.cities[cityIndex];
  if (!city) return;

  const pop = city.population;
  const newDistricts: string[] = [];

  if (pop > 50 && !city.districts.includes('farmlands')) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = clamp(city.x + dx, 0, map.width - 1);
        const ny = clamp(city.y + dy, 0, map.height - 1);
        const cell = map.grid[ny]![nx]!;
        if (cell.terrain === 'plains' && cell.feature === 'none') {
          cell.feature = 'farm';
          cell.district = 'farmlands';
        }
      }
    }
    newDistricts.push('farmlands');
  }

  if (pop > 100 && !city.districts.includes('market')) {
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const dist = 2;
      const nx = clamp(city.x + Math.round(Math.cos(angle) * dist), 0, map.width - 1);
      const ny = clamp(city.y + Math.round(Math.sin(angle) * dist), 0, map.height - 1);
      const cell = map.grid[ny]![nx]!;
      if (cell.feature === 'none' && cell.terrain !== 'water') {
        cell.feature = 'market';
        cell.district = 'market';
      }
    }
    newDistricts.push('market');
  }

  if (pop > 200 && !city.districts.includes('barracks')) {
    for (let i = 0; i < 2; i++) {
      const nx = clamp(city.x + (i === 0 ? -2 : 2), 0, map.width - 1);
      const ny = clamp(city.y + 1, 0, map.height - 1);
      const cell = map.grid[ny]![nx]!;
      if (cell.feature === 'none' && cell.terrain !== 'water') {
        cell.feature = 'barracks';
        cell.district = 'barracks';
      }
    }
    newDistricts.push('barracks');
  }

  if (pop > 150 && !city.districts.includes('temple')) {
    const nx = clamp(city.x - 1, 0, map.width - 1);
    const ny = clamp(city.y - 1, 0, map.height - 1);
    const cell = map.grid[ny]![nx]!;
    if (cell.feature === 'none' && cell.terrain !== 'water') {
      cell.feature = 'temple';
      cell.district = 'temple';
    }
    newDistricts.push('temple');
  }

  if (pop > 80 && city.walls === 0) {
    const wallRadius = 3;
    for (let dy = -wallRadius; dy <= wallRadius; dy++) {
      for (let dx = -wallRadius; dx <= wallRadius; dx++) {
        if (Math.abs(dx) === wallRadius || Math.abs(dy) === wallRadius) {
          const nx = clamp(city.x + dx, 0, map.width - 1);
          const ny = clamp(city.y + dy, 0, map.height - 1);
          const cell = map.grid[ny]![nx]!;
          if (cell.feature === 'none' && cell.terrain !== 'water') {
            cell.feature = 'palisade';
          }
        }
      }
    }
    city.walls = 1;
    newDistricts.push('walls');
  }

  city.districts.push(...newDistricts);
}

export function getResourcesOnTile(map: WorldMap, x: number, y: number): { resource: ResourceDeposit; amount: number } | null {
  if (y < 0 || y >= map.height || x < 0 || x >= map.width) return null;
  const cell = map.grid[y]![x]!;
  if (cell.resource === 'none') return null;
  return { resource: cell.resource, amount: cell.resourceAmount };
}

export function gatherResource(map: WorldMap, x: number, y: number, amount: number): number {
  const cell = map.grid[y]?.[x];
  if (!cell || cell.resource === 'none') return 0;
  const gathered = Math.min(amount, cell.resourceAmount);
  cell.resourceAmount -= gathered;
  if (cell.resourceAmount <= 0) {
    cell.resource = 'none';
    cell.resourceAmount = 0;
  }
  return gathered;
}

export function updateMapFeatures(map: WorldMap, population: number, discoveries: string[], epoch: number): void {
  const cx = Math.floor(map.width / 2);
  const cy = Math.floor(map.height / 2);

  // Expand the capital city
  const capital = map.cities[0];
  if (capital) {
    capital.population = population;
    expandCity(map, 0, epoch);
  }

  // Build roads between districts
  if (discoveries.some(d => /road|trade|wheel|transport/i.test(d))) {
    for (const city of map.cities) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          const nx = clamp(city.x + dx, 0, map.width - 1);
          const ny = clamp(city.y + dy, 0, map.height - 1);
          const cell = map.grid[ny]![nx]!;
          if (cell.feature !== 'none' && cell.feature !== 'road' && Math.random() < 0.2) {
            const rx = clamp(nx + (dx > 0 ? 1 : -1), 0, map.width - 1);
            const ry = clamp(ny + (dy > 0 ? 1 : -1), 0, map.height - 1);
            if (map.grid[ry]![rx]!.terrain !== 'water') {
              map.grid[ry]![rx]!.road = true;
            }
          }
        }
      }
    }
  }

  // Farms spread with farming tech
  if (discoveries.some(d => /farm|agricultur|irrigation/i.test(d))) {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const cell = map.grid[y]![x]!;
        if (cell.terrain === 'plains' && cell.feature === 'none' && Math.random() < 0.05) {
          cell.feature = 'farm';
        }
      }
    }
  }
}

export function renderMap(map: WorldMap): string {
  const lines: string[] = [];
  const header = `  +${'─'.repeat(map.width * 2 + 1)}+`;
  lines.push(header);
  for (const row of map.grid) {
    let line = '  |';
    for (const cell of row) {
      if (cell.river) {
        line += '\x1b[44m~\x1b[0m';
      } else if (cell.feature !== 'none' && cell.feature !== 'road') {
        line += FEATURE_SYMBOLS[cell.feature];
      } else if (cell.road) {
        line += FEATURE_SYMBOLS['road'];
      } else if (cell.resource !== 'none' && cell.resourceAmount > 0) {
        line += RESOURCE_SYMBOLS[cell.resource];
      } else {
        line += TERRAIN_SYMBOLS[cell.terrain];
      }
      line += ' ';
    }
    line += '|';
    lines.push(line);
  }
  lines.push(header);

  // City info
  for (const city of map.cities) {
    lines.push(`  ${city.name}: Pop ${city.population} | Districts: ${city.districts.join(', ')}${city.walls > 0 ? ' | Walled' : ''}`);
  }

  // Resource legend
  const resourceLegend = 'Resources: I=iron C=coal G=gold A=animals F=fish L=clay';
  lines.push(`  \x1b[90m${resourceLegend}\x1b[0m`);

  return lines.join('\n');
}
