import { useCallback, useMemo, useState } from 'react';
import { LevelSelect } from '../../components/LevelSelect';
import { LoadingScreen } from '../../components/LoadingScreen';
import { WithOverlay } from '../../components/WithOverlay';
import { theme } from '../../theme';
import { useProgress } from '../useProgress';
import { type Deal, type Rods, canPour, isRodComplete, levelSpec, topRun } from './logic';
import { loadDeal, useDeal } from './deals';
import { RodSortGame, type ShellProps, type SortRules } from './RodSortGame';

const colorName = (color: number) => theme.ringNames[color];

function rodLabel(rods: Rods, rod: number, capacity: number) {
  const rings = rods[rod];
  let contents = 'empty';
  if (isRodComplete(rings, capacity)) contents = `complete, ${colorName(rings[0])}`;
  else if (rings.length) {
    const top = `${topRun(rings)} ${colorName(rings[rings.length - 1])}`;
    contents = `${rings.map(colorName).join(', ')} from the bottom, top ${top}`;
  }
  return `Rod ${rod + 1}, ${contents}`;
}

export function HoopScreen({ onBack }: { onBack: () => void }) {
  const { level, unlocked, goTo, complete, loaded } = useProgress('hoops');
  const [picking, setPicking] = useState(false);
  const deal = useDeal(loaded ? level : null);
  const prepareNext = useCallback(() => loadDeal(level + 1), [level]);
  if (!deal) return <LoadingScreen title="Ring Sort" onBack={onBack} />;
  const levels = picking && (
    <LevelSelect
      title="Ring Sort"
      count={unlocked}
      unlocked={unlocked}
      current={level}
      onPick={(picked) => {
        goTo(picked);
        setPicking(false);
      }}
      onBack={() => setPicking(false)}
    />
  );
  return (
    <WithOverlay overlay={levels}>
      <RingSortGame
        key={level}
        deal={deal}
        capacity={levelSpec(level).capacity}
        title="Ring Sort"
        label={`Level ${level}`}
        onBack={onBack}
        onLevels={() => setPicking(true)}
        nextLabel="Next level"
        onNext={() => goTo(level + 1)}
        onWin={() => complete(level + 1)}
        onWinShown={prepareNext}
      />
    </WithOverlay>
  );
}

function ringSortRules(capacity: number): SortRules {
  return {
    capacity,
    goal: 'Sort each color onto its own rod',
    canPour: (rods, from, to) => canPour(rods, from, to, capacity),
    isRodComplete: (rod) => isRodComplete(rod, capacity),
    ringName: colorName,
    rodLabel: (rods, rod) => rodLabel(rods, rod, capacity),
  };
}

type GameProps = ShellProps & { deal: Deal; capacity: number };

export function RingSortGame({ deal, capacity, ...shell }: GameProps) {
  const rules = useMemo(() => ringSortRules(capacity), [capacity]);
  return <RodSortGame {...shell} start={deal.rods} rules={rules} />;
}
