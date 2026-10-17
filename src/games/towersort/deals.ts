import { dealCache } from '../dealCache';
import { EMPTY_RODS, type Rods } from '../hoops/logic';
import { towerSpec, towerTask } from './logic';

export const towerDeals = dealCache<Rods>({
  prefix: 'towersort.deal',
  task: (level) => towerTask(level),
  fits: (rods, level) => {
    const { colors, sizes } = towerSpec(level);
    const rings = rods.flat().sort((a, b) => a - b);
    return rods.length === colors + EMPTY_RODS && rings.length === colors * sizes && rings.every((ring, i) => ring === i);
  },
});
