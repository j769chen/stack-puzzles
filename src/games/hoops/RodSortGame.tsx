import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { GameShell, type GameShellProps } from '../../components/GameShell';
import { RodButtons } from '../../components/RodButtons';
import { feedback } from '../../feedback';
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
  'title' | 'label' | 'onBack' | 'onLevels' | 'levelsLabel' | 'scoring' | 'winNote' | 'onShare' | 'nextLabel' | 'onNext' | 'onWinShown'
>;

type Props = ShellProps & { start: Rods; rules: SortRules };

export function RodSortGame({ start, rules, ...shell }: Props) {
  const history = useHistory(() => createSnapshot(start));
  const [selected, setSelected] = useState<number | null>(null);

  const current = history.current;
  const { rods } = current;
  const { moves } = history;
  const isSolved = (state: Rods) => state.every((rod) => rod.length === 0 || rules.isRodComplete(rod));
  const solved = isSolved(rods);
  const stuck = !solved && !rods.some((_, from) => rods.some((_, to) => rules.canPour(rods, from, to)));
  const selectable = (rod: number) => rods[rod].length > 0 && !rules.isRodComplete(rods[rod]);

  const press = (rod: number) => {
    if (solved) return;
    if (selected === null) {
      if (!selectable(rod)) return;
      setSelected(rod);
      feedback.pick();
    } else if (selected === rod) {
      setSelected(null);
    } else if (rules.canPour(rods, selected, rod)) {
      const after = pourSnapshot(current, selected, rod);
      history.push(after);
      if (rules.isRodComplete(after.rods[rod])) {
        if (!isSolved(after.rods)) feedback.complete();
      } else {
        feedback.drop();
      }
      const ring = rules.ringName(rods[selected][rods[selected].length - 1]);
      AccessibilityInfo.announceForAccessibility(`Moved ${ring} to rod ${rod + 1}`);
      setSelected(null);
    } else if (selectable(rod)) {
      setSelected(rod);
      feedback.pick();
    } else {
      setSelected(null);
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
      message={stuck ? 'No moves left. Undo or restart.' : rules.goal}
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
        onPress={press}
      />
    </GameShell>
  );
}
