import { useMemo } from 'react';
import { GameShell, type GameShellProps } from '../../components/GameShell';
import { RodButtons } from '../../components/RodButtons';
import { isDeadEnd } from '../deadEnd';
import { useRodGame } from '../useRodGame';
import { HoopBoard } from './HoopBoard';
import { rodRows } from './layout';
import type { Rods } from './logic';

export type SortRules = {
  capacity: number;
  sizes?: number;
  goal: string;
  canPour: (rods: Rods, from: number, to: number) => boolean;
  isRodComplete: (rod: number[]) => boolean;
  ringName: (ring: number) => string;
  rodLabel: (rods: Rods, rod: number) => string;
};

const isSolved = (rods: Rods, rules: SortRules) => rods.every((rod) => rod.length === 0 || rules.isRodComplete(rod));

export type ShellProps = Pick<
  GameShellProps,
  | 'title'
  | 'label'
  | 'onBack'
  | 'onLevels'
  | 'levelsLabel'
  | 'scoring'
  | 'winNote'
  | 'onShare'
  | 'nextLabel'
  | 'onNext'
  | 'onWin'
  | 'onWinShown'
  | 'onProgress'
>;

type Props = ShellProps & { start: Rods; rules: SortRules };

export function RodSortGame({ start, rules, ...shell }: Props) {
  const game = useRodGame(() => start, {
    canMove: rules.canPour,
    isRodComplete: rules.isRodComplete,
    isSolved: (rods) => isSolved(rods, rules),
    pieceName: rules.ringName,
    placeName: (rod) => `rod ${rod + 1}`,
  });
  const { rods } = game;
  const stuck = useMemo(() => isDeadEnd(rods, rules.canPour, (state) => isSolved(state, rules)), [rods, rules]);

  return (
    <GameShell {...shell} {...game.controls} message={stuck ? 'No way to finish from here. Undo or restart.' : rules.goal}>
      <HoopBoard
        rods={rods}
        capacity={rules.capacity}
        sizes={rules.sizes}
        isRodComplete={rules.isRodComplete}
        ids={game.ids}
        selected={game.selected}
        onPress={game.press}
        onDrop={game.drop}
      />
      <RodButtons
        labels={rods.map((_, rod) => rules.rodLabel(rods, rod))}
        rowSizes={rodRows(rods.length)}
        selected={game.selected}
        canMoveTo={game.canMoveTo}
        onPress={game.press}
      />
    </GameShell>
  );
}
