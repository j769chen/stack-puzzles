import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { GameShell } from '../../components/GameShell';
import { RodButtons } from '../../components/RodButtons';
import { feedback } from '../../feedback';
import { theme } from '../../theme';
import { usePersistentNumber } from '../../usePersistentNumber';
import { type Move, useHistory } from '../useHistory';
import {
  type Rods,
  canPour,
  generateLevel,
  hasAnyMove,
  isHoopsSolved,
  isRodComplete,
  levelSpec,
  pour,
  solveHoops,
  topRun,
} from './logic';
import { HoopBoard } from './HoopBoard';
import { rodRows } from './layout';

type Snapshot = { rods: Rods; ids: number[][] };

const colorName = (color: number) => theme.ringNames[color];

function rodLabel(rods: Rods, rod: number, capacity: number, hint: Move | null) {
  const rings = rods[rod];
  let contents = 'empty';
  if (isRodComplete(rings, capacity)) contents = `complete, ${colorName(rings[0])}`;
  else if (rings.length) {
    const top = `${topRun(rings)} ${colorName(rings[rings.length - 1])}`;
    contents = `${rings.map(colorName).join(', ')} from the bottom, top ${top}`;
  }
  const hinted = hint?.[0] === rod ? ', hint: move from here' : hint?.[1] === rod ? ', hint: move here' : '';
  return `Rod ${rod + 1}, ${contents}${hinted}`;
}

export function HoopScreen({ onBack }: { onBack: () => void }) {
  const [level, setLevel, loaded] = usePersistentNumber('hoops.level', 1);
  if (!loaded) return null;
  return <HoopGame key={level} level={level} onBack={onBack} onNext={() => setLevel(level + 1)} />;
}

function createSnapshot(rods: Rods): Snapshot {
  let next = 0;
  return { rods, ids: rods.map((rod) => rod.map(() => next++)) };
}

function pourSnapshot({ rods, ids }: Snapshot, from: number, to: number): Snapshot {
  const nextIds = ids.map((r) => [...r]);
  nextIds[to].push(nextIds[from].pop()!);
  return { rods: pour(rods, from, to), ids: nextIds };
}

type GameProps = { level: number; onBack: () => void; onNext: () => void };

function HoopGame({ level, onBack, onNext }: GameProps) {
  const { capacity } = levelSpec(level);
  const [deal] = useState(() => generateLevel(level));
  const history = useHistory(() => createSnapshot(deal.rods));
  const optimal = deal.solution.length;
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<Move[] | null>(deal.solution);

  const current = history.current;
  const { rods } = current;
  const { moves } = history;
  const solved = isHoopsSolved(rods, capacity);
  const stuck = !solved && !hasAnyMove(rods, capacity);
  const selectable = (rod: number) => rods[rod].length > 0 && !isRodComplete(rods[rod], capacity);

  const clearSelection = () => {
    setSelected(null);
    setHint(null);
    setHintMessage(null);
  };

  const press = (rod: number) => {
    if (solved) return;
    if (selected === null) {
      if (!selectable(rod)) return;
      setSelected(rod);
      feedback.pick();
    } else if (selected === rod) {
      setSelected(null);
    } else if (canPour(rods, selected, rod, capacity)) {
      const after = pourSnapshot(current, selected, rod);
      history.push(after);
      if (isRodComplete(after.rods[rod], capacity)) {
        if (!isHoopsSolved(after.rods, capacity)) feedback.complete();
      } else {
        feedback.drop();
      }
      const color = colorName(rods[selected][rods[selected].length - 1]);
      AccessibilityInfo.announceForAccessibility(`Moved ${color} to rod ${rod + 1}`);
      const [next, ...rest] = plan ?? [];
      setPlan(next?.[0] === selected && next[1] === rod ? rest : null);
      clearSelection();
    } else if (selectable(rod)) {
      setSelected(rod);
      feedback.pick();
    } else {
      setSelected(null);
    }
  };

  const showHint = () => {
    setSelected(null);
    const path = plan?.length ? plan : solveHoops(rods, capacity);
    setPlan(path);
    setHint(path?.[0] ?? null);
    setHintMessage(path ? null : 'No solution from here. Try undo.');
    AccessibilityInfo.announceForAccessibility(
      path ? `Hint: move from rod ${path[0][0] + 1} to rod ${path[0][1] + 1}` : 'No solution from here. Try undo.',
    );
  };

  const message =
    hintMessage ?? (stuck ? 'No moves left. Undo or restart.' : `Sort each color onto its own rod · best ${optimal}`);

  return (
    <GameShell
      title="Ring Sort"
      level={level}
      moves={moves}
      message={message}
      onBack={onBack}
      onUndo={() => {
        history.undo();
        setPlan(null);
        clearSelection();
      }}
      canUndo={moves > 0}
      onRestart={() => {
        history.restart();
        setPlan(deal.solution);
        clearSelection();
      }}
      onHint={showHint}
      won={solved}
      winText={
        moves === optimal
          ? `Perfect! ${moves} moves, the minimum possible.`
          : `${moves} moves. The minimum is ${optimal}.`
      }
      nextLabel="Next level"
      onNext={onNext}
    >
      <HoopBoard rods={rods} capacity={capacity} ids={current.ids} selected={selected} hint={hint} onPress={press} />
      <RodButtons
        labels={rods.map((_, rod) => rodLabel(rods, rod, capacity, hint))}
        rowSizes={rodRows(rods.length)}
        selected={selected}
        onPress={press}
      />
    </GameShell>
  );
}
