import { useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { GameShell, type GameShellProps } from '../../components/GameShell';
import { RodButtons } from '../../components/RodButtons';
import { feedback } from '../../feedback';
import { isDeadEnd } from '../deadEnd';
import { useHistory } from '../useHistory';
import { HoopBoard } from './HoopBoard';
import { rodRows } from './layout';
import { type Rods, pour } from './logic';

export type SortRules = {
  capacity: number;
  sizes?: number;
  goal: string;
  canPour: (rods: Rods, from: number, to: number) => boolean;
  isRodComplete: (rod: number[]) => boolean;
  ringName: (ring: number) => string;
  rodLabel: (rods: Rods, rod: number) => string;
};

type Snapshot = { rods: Rods; ids: number[][] };

const isSolved = (rods: Rods, rules: SortRules) => rods.every((rod) => rod.length === 0 || rules.isRodComplete(rod));

function createSnapshot(rods: Rods): Snapshot {
  let next = 0;
  return { rods, ids: rods.map((rod) => rod.map(() => next++)) };
}

function pourSnapshot({ rods, ids }: Snapshot, from: number, to: number): Snapshot {
  const nextIds = ids.map((r) => [...r]);
  nextIds[to].push(nextIds[from].pop()!);
  return { rods: pour(rods, from, to), ids: nextIds };
}

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
>;

type Props = ShellProps & { start: Rods; rules: SortRules };

export function RodSortGame({ start, rules, ...shell }: Props) {
  const history = useHistory(() => createSnapshot(start));
  const [selected, setSelected] = useState<number | null>(null);

  const current = history.current;
  const { rods } = current;
  const { moves } = history;
  const solved = isSolved(rods, rules);
  const stuck = useMemo(() => isDeadEnd(rods, rules.canPour, (state) => isSolved(state, rules)), [rods, rules]);
  const selectable = (rod: number) => rods[rod].length > 0 && !rules.isRodComplete(rods[rod]);
  const topRing = (rod: number) => rules.ringName(rods[rod][rods[rod].length - 1]);

  const press = (rod: number) => {
    if (solved) return;
    if (selected === null) {
      if (!selectable(rod)) return;
      setSelected(rod);
      feedback.pick();
      AccessibilityInfo.announceForAccessibility(`Picked up ${topRing(rod)} from rod ${rod + 1}`);
    } else if (selected === rod) {
      setSelected(null);
      AccessibilityInfo.announceForAccessibility(`Put ${topRing(rod)} back`);
    } else if (rules.canPour(rods, selected, rod)) {
      const after = pourSnapshot(current, selected, rod);
      history.push(after);
      if (rules.isRodComplete(after.rods[rod])) {
        if (!isSolved(after.rods, rules)) feedback.complete();
      } else {
        feedback.drop();
      }
      AccessibilityInfo.announceForAccessibility(`Moved ${topRing(selected)} to rod ${rod + 1}`);
      setSelected(null);
    } else if (selectable(rod)) {
      setSelected(rod);
      feedback.pick();
      AccessibilityInfo.announceForAccessibility(
        `Can't move ${topRing(selected)} to rod ${rod + 1}. Picked up ${topRing(rod)} instead`,
      );
    } else {
      setSelected(null);
      AccessibilityInfo.announceForAccessibility(`Can't move ${topRing(selected)} to rod ${rod + 1}`);
    }
  };

  const drop = (rod: number) => {
    if (selected !== null && rules.canPour(rods, selected, rod)) press(rod);
    else setSelected(null);
  };

  return (
    <GameShell
      {...shell}
      moves={moves}
      message={stuck ? 'No way to finish from here. Undo or restart.' : rules.goal}
      onUndo={() => {
        history.undo();
        setSelected(null);
      }}
      canUndo={moves > 0}
      onRestart={() => {
        history.restart();
        setSelected(null);
      }}
      won={solved}
    >
      <HoopBoard
        rods={rods}
        capacity={rules.capacity}
        sizes={rules.sizes}
        isRodComplete={rules.isRodComplete}
        ids={current.ids}
        selected={selected}
        onPress={press}
        onDrop={drop}
      />
      <RodButtons
        labels={rods.map((_, rod) => rules.rodLabel(rods, rod))}
        rowSizes={rodRows(rods.length)}
        selected={selected}
        canMoveTo={(rod) => selected !== null && rules.canPour(rods, selected, rod)}
        onPress={press}
      />
    </GameShell>
  );
}
