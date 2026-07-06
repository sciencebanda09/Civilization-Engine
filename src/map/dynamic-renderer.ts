import type { WorldMap, TerrainTile, FeatureTile } from './terrain.js';
import type { ClimateState } from '../game/game-session.js';
import { R, D, GY, YEL, RED, GRN, CYN, MAG, BLU, W } from '../ui/ansi.js';

export interface DynamicRenderOptions {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  climate: ClimateState;
  drought: boolean;
  fire: boolean;
  defenseLevel: number;
  deforestation: number;
}

const FIRE_TILES = new Set<string>();
let fireFrame = 0;

const TERRAIN_BASE: Record<TerrainTile, string> = {
  water: '\x1b[44m \x1b[0m',
  forest: '\x1b[42m \x1b[0m',
  plains: '\x1b[43m \x1b[0m',
  hills: '\x1b[48;5;94m \x1b[0m',
  mountain: '\x1b[47m \x1b[0m',
  desert: '\x1b[48;5;214m \x1b[0m',
  swamp: '\x1b[48;5;22m \x1b[0m',
};

const TERRAIN_SEASONAL: Record<string, Record<TerrainTile, string>> = {
  spring: {
    water: '\x1b[44m \x1b[0m',
    forest: '\x1b[42m \x1b[0m',
    plains: '\x1b[43m \x1b[0m',
    hills: '\x1b[48;5;94m \x1b[0m',
    mountain: '\x1b[47m \x1b[0m',
    desert: '\x1b[48;5;214m \x1b[0m',
    swamp: '\x1b[48;5;22m \x1b[0m',
  },
  summer: {
    water: '\x1b[46m \x1b[0m',
    forest: '\x1b[42m \x1b[0m',
    plains: '\x1b[48;5;220m \x1b[0m',
    hills: '\x1b[48;5;172m \x1b[0m',
    mountain: '\x1b[47m \x1b[0m',
    desert: '\x1b[48;5;208m \x1b[0m',
    swamp: '\x1b[48;5;64m \x1b[0m',
  },
  autumn: {
    water: '\x1b[44m \x1b[0m',
    forest: '\x1b[48;5;166m \x1b[0m',
    plains: '\x1b[48;5;214m \x1b[0m',
    hills: '\x1b[48;5;130m \x1b[0m',
    mountain: '\x1b[47m \x1b[0m',
    desert: '\x1b[48;5;214m \x1b[0m',
    swamp: '\x1b[48;5;58m \x1b[0m',
  },
  winter: {
    water: '\x1b[36m \x1b[0m',
    forest: '\x1b[48;5;250m \x1b[0m',
    plains: '\x1b[47m \x1b[0m',
    hills: '\x1b[48;5;250m \x1b[0m',
    mountain: '\x1b[37m \x1b[0m',
    desert: '\x1b[47m \x1b[0m',
    swamp: '\x1b[48;5;245m \x1b[0m',
  },
};

function getTerrainForSeason(t: TerrainTile, season: string, drought: boolean, deforest: number): string {
  if (drought && t === 'plains') return '\x1b[48;5;130m \x1b[0m';
  if (drought && t === 'forest') return '\x1b[48;5;94m \x1b[0m';
  if (deforest > 50 && t === 'forest' && Math.random() < 0.1) return '\x1b[43m \x1b[0m';
  return (TERRAIN_SEASONAL[season] ?? TERRAIN_BASE)[t] ?? TERRAIN_BASE[t];
}

export function renderDynamicMap(
  map: WorldMap,
  options: DynamicRenderOptions,
  events: string[],
): string {
  fireFrame++;
  const { season, climate, drought, fire, defenseLevel } = options;

  if (fire && fireFrame % 3 === 0) {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (Math.random() < 0.02) {
          FIRE_TILES.add(`${x},${y}`);
        }
      }
    }
  }

  const lines: string[] = [];
  const header = `  +${'─'.repeat(map.width * 2 + 1)}+`;
  lines.push(header);

  for (let y = 0; y < map.height; y++) {
    let line = '  |';
    for (let x = 0; x < map.width; x++) {
      const cell = map.grid[y]![x]!;
      const isFire = fire && FIRE_TILES.has(`${x},${y}`);

      if (isFire) {
        line += fireFrame % 6 < 3 ? '\x1b[31mF\x1b[0m' : '\x1b[33mF\x1b[0m';
      } else if (cell.feature !== 'none' && cell.feature !== 'road') {
        line += getFeatureSeasonal(cell.feature, season, defenseLevel);
      } else if (cell.road) {
        line += '\x1b[37m=\x1b[0m';
      } else {
        const deforestVal = climate.deforestation;
        line += getTerrainForSeason(cell.terrain, season, drought, deforestVal);
      }
      line += ' ';
    }
    line += '|';
    lines.push(line);
  }

  lines.push(header);

  for (const city of map.cities) {
    const wallStr = defenseLevel > 0 ? `${RED}🛡${R}${defenseLevel}` : '';
    lines.push(`  ${city.name}: Pop ${city.population} ${wallStr}`);
  }

  const seasonEmoji: Record<string, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
  const se = seasonEmoji[season] ?? '';
  const climateLine = `${se}${season.toUpperCase()}  ${Math.round(climate.temperature)}°C  CO₂:${climate.co2.toFixed(0)}  🌲${Math.max(0, 100 - Math.round(climate.deforestation))}%`;
  lines.push(`  ${D}${climateLine}${R}`);

  if (drought) lines.push(`  ${YEL}⚠ DROUGHT${R}`);
  if (fire) lines.push(`  ${RED}⚠ WILDFIRES${R}`);

  return lines.join('\n');
}

function getFeatureSeasonal(f: FeatureTile, season: string, defense: number): string {
  switch (f) {
    case 'hut': return '\x1b[31mH\x1b[0m';
    case 'campfire': return season === 'winter' ? '\x1b[33m★\x1b[0m' : '\x1b[33m*\x1b[0m';
    case 'palisade': return defense > 30 ? '\x1b[37m█\x1b[0m' : '\x1b[37mW\x1b[0m';
    case 'farm': return season === 'autumn' ? '\x1b[33mF\x1b[0m' : '\x1b[32mF\x1b[0m';
    case 'mine': return '\x1b[90mM\x1b[0m';
    case 'tower': return '\x1b[36mT\x1b[0m';
    case 'capital': return '\x1b[31mC\x1b[0m';
    case 'market': return '\x1b[33mK\x1b[0m';
    case 'barracks': return defense > 20 ? '\x1b[31mB\x1b[0m' : '\x1b[90mB\x1b[0m';
    case 'temple': return '\x1b[35mP\x1b[0m';
    case 'road': return '\x1b[37m=\x1b[0m';
    default: return ' ';
  }
}

export function clearFireTiles(): void {
  FIRE_TILES.clear();
}
