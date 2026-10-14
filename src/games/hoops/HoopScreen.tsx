import { useState } from 'react';
import { GameShell } from '../../components/GameShell';
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
} from './logic';
import { HoopBoard } from './HoopBoard';

type Snapshot = { rods: Rods; ids: number[][] };

export function HoopScreen({ onBack }: { onBack: () => void }) {
  const [level, setLevel, loaded] = usePersistentNumber('hoops.level', 1);
  if (!loaded) return null;
  return <HoopGame key={level} level={level} onBack={onBack} onNext={() => setLevel(level + 1)} />;
}

function createSnapshot(rods: Rods): Snapshot {
  let next = 0;
  return { rods, ids: rods.map((rod) => rod.map(() => next++)) };
}

function pourSnapshot({ rods, ids }: Snapshot, from: number, to: number, capacity: number): Snapshot {
  const nextRods = pour(rods, from, to, capacity);
  const nextIds = ids.map((r) => [...r]);
  for (let i = rods[from].length - nextRods[from].length; i > 0; i--) nextIds[to].push(nextIds[from].pop()!);
  return { rods: nextRods, ids: nextIds };
}

type GameProps = { level: number; onBack: () => void; onNext: () => void };

function HoopGame({ level, onBack, onNext }: GameProps) {
  const { capacity } = levelSpec(level);
  const history = useHistory(() => createSnapshot(generateLevel(level)));
  const [optimal] = useState(() => solveHoops(history.current.rods, capacity)!.length);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<Move[] | null>(null);

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
      if (selectable(rod)) setSelected(rod);
    } else if (selected === rod) {
      setSelected(null);
    } else if (canPour(rods, selected, rod, capacity)) {
      history.push(pourSnapshot(current, selected, rod, capacity));
      const [next, ...rest] = plan ?? [];
      setPlan(next?.[0] === selected && next[1] === rod ? rest : null);
      clearSelection();
    } else {
      setSelected(selectable(rod) ? rod : null);
    }
  };

  const showHint = () => {
    setSelected(null);
    const path = plan?.length ? plan : solveHoops(rods, capacity);
    setPlan(path);
    setHint(path?.[0] ?? null);
    setHintMessage(path ? null : 'No solution from here. Try undo.');
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
        setPlan(null);
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
    </GameShell>
  );
}
