import { useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { usePersistentNumber } from '../../usePersistentNumber';
import {
  type Move,
  type Rods,
  canPour,
  generateLevel,
  hasAnyMove,
  isHoopsSolved,
  isRodComplete,
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

function pourSnapshot({ rods, ids }: Snapshot, from: number, to: number): Snapshot {
  const nextRods = pour(rods, from, to);
  const nextIds = ids.map((r) => [...r]);
  for (let i = rods[from].length - nextRods[from].length; i > 0; i--) nextIds[to].push(nextIds[from].pop()!);
  return { rods: nextRods, ids: nextIds };
}

type GameProps = { level: number; onBack: () => void; onNext: () => void };

function HoopGame({ level, onBack, onNext }: GameProps) {
  const [start] = useState(() => createSnapshot(generateLevel(level)));
  const [history, setHistory] = useState<Snapshot[]>([start]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<Move[] | null>(null);

  const current = history[history.length - 1];
  const { rods } = current;
  const moves = history.length - 1;
  const solved = isHoopsSolved(rods);
  const stuck = !solved && !hasAnyMove(rods);

  const reset = () => {
    setSelected(null);
    setHint(null);
    setHintMessage(null);
  };

  const press = (rod: number) => {
    if (solved) return;
    if (selected === null) {
      if (rods[rod].length && !isRodComplete(rods[rod])) setSelected(rod);
    } else if (selected === rod) {
      setSelected(null);
    } else if (canPour(rods, selected, rod)) {
      setHistory((h) => [...h, pourSnapshot(current, selected, rod)]);
      setPlan((p) => (p?.[0][0] === selected && p[0][1] === rod ? p.slice(1) : null));
      reset();
    } else {
      setSelected(rods[rod].length && !isRodComplete(rods[rod]) ? rod : null);
    }
  };

  const showHint = () => {
    setSelected(null);
    const path = plan?.length ? plan : solveHoops(rods);
    setPlan(path);
    setHint(path?.[0] ?? null);
    setHintMessage(path ? null : 'No solution from here. Try undo.');
  };

  const message = hintMessage ?? (stuck ? 'No moves left. Undo or restart.' : 'Sort the rings so each rod holds one color');

  return (
    <GameShell
      title="Ring Sort"
      level={level}
      moves={moves}
      message={message}
      onBack={onBack}
      onUndo={() => {
        setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
        setPlan(null);
        reset();
      }}
      canUndo={moves > 0}
      onRestart={() => {
        setHistory([start]);
        setPlan(null);
        reset();
      }}
      onHint={showHint}
      won={solved}
      winText={`Sorted in ${moves} moves.`}
      nextLabel="Next level"
      onNext={onNext}
    >
      <HoopBoard rods={rods} ids={current.ids} selected={selected} hint={hint} onPress={press} />
    </GameShell>
  );
}
