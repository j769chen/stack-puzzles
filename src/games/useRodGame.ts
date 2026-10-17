import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { feedback } from '../feedback';
import { type Rods, pour } from './hoops/logic';
import { useHistory } from './useHistory';

type RodRules = {
  canMove: (rods: Rods, from: number, to: number) => boolean;
  isRodComplete: (rod: number[]) => boolean;
  isSolved: (rods: Rods) => boolean;
  pieceName: (piece: number) => string;
  placeName: (rod: number) => string;
};

type Snapshot = { rods: Rods; ids: number[][] };

function createSnapshot(rods: Rods): Snapshot {
  let next = 0;
  return { rods, ids: rods.map((rod) => rod.map(() => next++)) };
}

function pourSnapshot({ rods, ids }: Snapshot, from: number, to: number): Snapshot {
  const nextIds = ids.map((r) => [...r]);
  nextIds[to]!.push(nextIds[from]!.pop()!);
  return { rods: pour(rods, from, to), ids: nextIds };
}

export function useRodGame(start: () => Rods, rules: RodRules) {
  const history = useHistory(() => createSnapshot(start()));
  const [selected, setSelected] = useState<number | null>(null);

  const current = history.current;
  const { rods } = current;
  const { moves } = history;
  const solved = rules.isSolved(rods);
  const cantPick = (rod: number) => {
    if (rods[rod]!.length === 0) return 'Nothing to pick up';
    return rules.isRodComplete(rods[rod]!) ? 'Already sorted' : null;
  };
  const top = (rod: number) => rules.pieceName(rods[rod]!.at(-1)!);
  const announce = (message: string) => AccessibilityInfo.announceForAccessibility(message);

  const press = (rod: number) => {
    if (solved) return;
    if (selected === null) {
      const reason = cantPick(rod);
      if (reason) {
        announce(reason);
        return;
      }
      setSelected(rod);
      feedback.pick();
      announce(`Picked up ${top(rod)} from ${rules.placeName(rod)}`);
    } else if (selected === rod) {
      setSelected(null);
      announce(`Put ${top(rod)} back`);
    } else if (rules.canMove(rods, selected, rod)) {
      const after = pourSnapshot(current, selected, rod);
      history.push(after);
      if (!rules.isSolved(after.rods)) {
        if (rules.isRodComplete(after.rods[rod]!)) feedback.complete();
        else feedback.drop();
      }
      announce(`Moved ${top(selected)} to ${rules.placeName(rod)}`);
      setSelected(null);
    } else if (!cantPick(rod)) {
      setSelected(rod);
      feedback.pick();
      announce(`Can't move ${top(selected)} to ${rules.placeName(rod)}. Picked up ${top(rod)} instead`);
    } else {
      setSelected(null);
      announce(`Can't move ${top(selected)} to ${rules.placeName(rod)}`);
    }
  };

  const drop = (rod: number) => {
    if (selected !== null && rules.canMove(rods, selected, rod)) press(rod);
    else setSelected(null);
  };

  return {
    rods,
    ids: current.ids,
    selected,
    press,
    drop,
    cantPick,
    canMoveTo: (rod: number) => selected !== null && rules.canMove(rods, selected, rod),
    controls: {
      moves,
      onUndo: () => {
        history.undo();
        setSelected(null);
      },
      canUndo: moves > 0,
      onRestart: () => {
        history.restart();
        setSelected(null);
      },
      won: solved,
    },
  };
}
