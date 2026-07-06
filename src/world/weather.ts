export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface WeatherState {
  season: Season;
  epoch: number;
  temperature: number;
  rainfall: number;
  severity: 'mild' | 'normal' | 'harsh';
  description: string;
}

const SEASON_CYCLE: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function getSeason(epoch: number): Season {
  return SEASON_CYCLE[epoch % 4]!;
}

export function generateWeather(epoch: number): WeatherState {
  const season = getSeason(epoch);
  const baseTemp: Record<Season, number> = { spring: 15, summer: 28, autumn: 12, winter: -2 };
  const baseRain: Record<Season, number> = { spring: 60, summer: 30, autumn: 50, winter: 20 };

  const variance = Math.sin(epoch * 1.7) * 8;
  const temp = baseTemp[season]! + variance;
  const rain = baseRain[season]! + Math.sin(epoch * 2.3) * 20;
  const severity: WeatherState['severity'] = temp < -10 || temp > 40 || rain < 5 ? 'harsh' : Math.random() < 0.2 ? 'mild' : 'normal';

  const descriptions: Record<Season, string[]> = {
    spring: [`${Math.round(temp)}°C, ${Math.round(rain)}mm rain — gentle spring`, `Spring blooms after ${Math.round(rain)}mm of showers`, `Mild spring air at ${Math.round(temp)}°C`],
    summer: [`${Math.round(temp)}°C summer heat`, `Hot and dry — ${Math.round(rain)}mm rain this season`, `Blazing summer at ${Math.round(temp)}°C`],
    autumn: [`${Math.round(temp)}°C, leaves turning`, `Crisp autumn air, ${Math.round(rain)}mm rain`, `Cool autumn at ${Math.round(temp)}°C`],
    winter: [`Bitter cold at ${Math.round(temp)}°C`, `Snow and ice — ${Math.round(rain)}mm precipitation`, `Freezing winter, ${Math.round(temp)}°C`],
  };

  return {
    season,
    epoch,
    temperature: Math.round(temp),
    rainfall: Math.round(rain),
    severity,
    description: descriptions[season]![Math.floor(Math.random() * descriptions[season]!.length)]!,
  };
}

export function applyWeatherToResources(resources: Record<string, number>, weather: WeatherState): { resources: Record<string, number>; changes: string[] } {
  const changes: string[] = [];
  const res = { ...resources };

  if (weather.season === 'winter') {
    res.food = Math.max(0, (res.food ?? 0) - (weather.temperature < -10 ? 30 : 15));
    if (weather.temperature < -10) changes.push('Bitter cold reduced the food stores.');
    else changes.push('Winter meant less foraging.');
  }
  if (weather.season === 'summer' && weather.rainfall < 15) {
    res.food = Math.max(0, (res.food ?? 0) - 10);
    res.wood = Math.max(0, (res.wood ?? 0) - 5);
    changes.push('Drought withered the crops.');
  }
  if (weather.season === 'spring' && weather.rainfall > 70) {
    res.food = Math.max(0, (res.food ?? 0) + 20);
    res.wood = Math.max(0, (res.wood ?? 0) + 10);
    changes.push('Spring rains brought abundance.');
  }
  if (weather.season === 'autumn') {
    res.food = (res.food ?? 0) + 15;
    res.wood = (res.wood ?? 0) + 10;
    changes.push('Autumn harvest filled the stores.');
  }

  return { resources: res, changes };
}
