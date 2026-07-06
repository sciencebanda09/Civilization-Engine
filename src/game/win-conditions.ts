export type GameResult = 'undecided' | 'win' | 'loss';

export interface WinCheckInput {
  epoch: number;
  maxEpochs: number;
  population: number;
  era: string;
  discoveries: number;
  totalHypotheses: number;
  resources: Record<string, number>;
}

export function checkWinLose(input: WinCheckInput): { result: GameResult; reason: string } {
  // Win conditions
  if (input.era !== 'Stone Age' && input.population >= 80) {
    return { result: 'win', reason: `Your civilization advanced to the ${input.era} with ${input.population} people. The age of making has begun.` };
  }
  if (input.discoveries >= 12 && input.population >= 100) {
    return { result: 'win', reason: `With ${input.discoveries} discoveries and a population of ${input.population}, your people have entered a golden age.` };
  }
  if (input.epoch >= input.maxEpochs && input.population >= 80) {
    return { result: 'win', reason: 'The scribe closes the book. Your civilization endures.' };
  }

  // Lose conditions
  if (input.population <= 0) {
    return { result: 'loss', reason: 'Silence. The last hearth fire has gone cold. The civilization is no more.' };
  }
  if (input.population < 5 && input.epoch > 10) {
    return { result: 'loss', reason: `Only ${input.population} souls remain. They scatter into the wilderness, never to be seen again.` };
  }
  if (input.resources.food <= 0 && input.population < 20) {
    return { result: 'loss', reason: 'Starvation claimed the last of them. The settlement is abandoned.' };
  }
  if (input.epoch >= input.maxEpochs && input.population < 20) {
    return { result: 'loss', reason: 'The final chapter is written in ashes. The tribe could not survive.' };
  }

  return { result: 'undecided', reason: '' };
}
