import { useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { usePersistentNumber } from '../../usePersistentNumber';
import { type Move, useHistory } from '../useHistory';
import {
  HANOI_MAX_LEVEL,
  canMoveDisk,
  createHanoi,
  disksForLevel,
  isHanoiSolved,
  minMoves,
  moveDisk,
  nextHanoiMove,
} from './logic';
import { HanoiBoard } from './HanoiBoard';

const PEG_NAMES = ['left', 'middle', 'right'];

export function HanoiScreen({ onBack }: { onBack: () => void }) {
  const [level, setLevel, loaded] = usePersistentNumber('hanoi.level', 1);
  if (!loaded) return null;
  return (
    <HanoiGame
      key={level}
      level={level}
      onBack={onBack}
      onNext={() => setLevel(level >= HANOI_MAX_LEVEL ? 1 : level + 1)}
    />
  );
}

type GameProps = { level: number; onBack: () => void; onNext: () => void };

function HanoiGame({ level, onBack, onNext }: GameProps) {
  const disks = disksForLevel(level);
  const history = useHistory(() => createHanoi(disks));
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Move | null>(null);

  const state = history.current;
  const { moves } = history;
  const solved = isHanoiSolved(state, disks);

  const clearSelection = () => {
    setSelected(null);
    setHint(null);
  };

  const press = (peg: number) => {
    if (solved) return;
    if (selected === null) {
      if (state[peg].length) setSelected(peg);
    } else if (selected === peg) {
      setSelected(null);
    } else if (canMoveDisk(state, selected, peg)) {
      history.push(moveDisk(state, selected, peg));
      clearSelection();
    } else {
      setSelected(state[peg].length ? peg : null);
    }
  };

  const optimal = minMoves(disks);
  const message = hint
    ? `Move the top disk from the ${PEG_NAMES[hint[0]]} peg to the ${PEG_NAMES[hint[1]]} peg`
    : `Move all ${disks} disks to another peg · best ${optimal}`;

  return (
    <GameShell
      title="Tower Stack"
      level={level}
      moves={moves}
      message={message}
      onBack={onBack}
      onUndo={() => {
        history.undo();
        clearSelection();
      }}
      canUndo={moves > 0}
      onRestart={() => {
        history.restart();
        clearSelection();
      }}
      onHint={() => {
        setSelected(null);
        setHint(nextHanoiMove(state, disks));
      }}
      won={solved}
      winText={
        moves === optimal
          ? `Perfect! ${moves} moves, the minimum possible.`
          : `${moves} moves. The minimum is ${optimal}.`
      }
      nextLabel={level >= HANOI_MAX_LEVEL ? 'Play again from level 1' : 'Next level'}
      onNext={onNext}
    >
      <HanoiBoard state={state} disks={disks} selected={selected} hint={hint} onPress={press} />
    </GameShell>
  );
}
