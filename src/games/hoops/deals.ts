import { dealCache } from '../dealCache';
import { type Deal, EMPTY_RODS, type LevelSpec, dailySpec, dailyTask, levelSpec, levelTask } from './logic';

const fits = ({ rods, solution }: Deal, { colors, capacity }: LevelSpec) =>
  rods.length === colors + EMPTY_RODS &&
  rods.flat().length === colors * capacity &&
  rods.every((rod) => rod.length <= capacity) &&
  solution.length > 0;

export const levelDeals = dealCache<Deal>({
  prefix: 'hoops.deal',
  task: (level) => levelTask(level),
  fits: (deal, level) => fits(deal, levelSpec(level)),
});

export const dailyDeals = dealCache<Deal>({
  prefix: 'daily.deal',
  task: (key) => dailyTask(key),
  fits: (deal, key) => fits(deal, dailySpec(key)),
});
