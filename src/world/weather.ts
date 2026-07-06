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
    if (weather.temperature < -10) changes.push('Bitter cold devastated the food stores.');
    else changes.push('Winter scarcity thinned the larder.');
    res.wood = Math.max(0, (res.wood ?? 0) - 5);
  } else if (weather.season === 'spring') {
    res.food = (res.food ?? 0) + 10;
    if (weather.rainfall > 70) {
      res.food += 15;
      res.wood = (res.wood ?? 0) + 10;
      changes.push('Heavy spring rains promise a good growing season.');
    } else if (weather.rainfall < 20) {
      res.food -= 5;
      changes.push('Dry spring — planting is difficult.');
    } else {
      changes.push('Spring planting begins. The fields are sown.');
    }
  } else if (weather.season === 'summer') {
    if (weather.rainfall < 15) {
      res.food = Math.max(0, (res.food ?? 0) - 12);
      res.wood = Math.max(0, (res.wood ?? 0) - 5);
      changes.push('Summer drought! Crops wither in the fields.');
    } else if (weather.temperature > 35) {
      res.food = Math.max(0, (res.food ?? 0) - 8);
      changes.push('Heat wave stresses the settlement.');
    } else {
      res.food += 10;
      changes.push('Summer growth — crops are thriving.');
    }
  } else if (weather.season === 'autumn') {
    res.food = (res.food ?? 0) + 25;
    res.wood = (res.wood ?? 0) + 15;
    res.stone = (res.stone ?? 0) + 5;
    changes.push('Harvest season! The stores are filled.');
  }

  return { resources: res, changes };
}

export function getSeasonDrought(weather: WeatherState): boolean {
  return (weather.season === 'summer' && weather.rainfall < 20) ||
    (weather.season === 'spring' && weather.rainfall < 10);
}

export function getSeasonDescription(season: Season): string {
  const desc: Record<Season, string> = {
    spring: '🌸 Spring — the world awakens',
    summer: '☀️ Summer — the sun beats down',
    autumn: '🍂 Autumn — the harvest comes',
    winter: '❄️ Winter — the cold sets in',
  };
  return desc[season] ?? '';
}
