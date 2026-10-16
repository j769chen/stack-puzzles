import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { GameShell } from '../../components/GameShell';
import { LevelSelect } from '../../components/LevelSelect';
import { RodButtons } from '../../components/RodButtons';
import { feedback } from '../../feedback';
import { useStars } from '../../stars';
import { useHistory } from '../useHistory';
import { useProgress } from '../useProgress';
import {
  HANOI_MAX_LEVEL,
  type HanoiState,
  canMoveDisk,
  createHanoi,
  disksForLevel,
  isHanoiSolved,
  minMoves,
  moveDisk,
} from './logic';
import { HanoiBoard } from './HanoiBoard';

const PEG_NAMES = ['left', 'middle', 'right'];

function pegLabel(state: HanoiState, peg: number) {
  const disks = state[peg];
  const contents = disks.length ? `disks ${disks.join(', ')} from the bottom` : 'empty';
  return `${PEG_NAMES[peg]} peg, ${contents}`;
}

export function HanoiScreen({ onBack }: { onBack: () => void }) {
  const stars = useStars('hanoi');
  const { level, unlocked, goTo, complete, loaded } = useProgress('hanoi', HANOI_MAX_LEVEL, stars);
  const [picking, setPicking] = useState(false);
  if (!loaded) return null;
  const next = level >= HANOI_MAX_LEVEL ? 1 : level + 1;
  return (
    <View style={styles.root}>
      <HanoiGame
        key={level}
        level={level}
        onBack={onBack}
        onLevels={() => setPicking(true)}
        onNext={() => goTo(next)}
        onWin={() => complete(next)}
      />
      {picking && (
        <LevelSelect
          title="Tower Stack"
          count={HANOI_MAX_LEVEL}
          unlocked={unlocked}
          current={level}
          stars={stars}
          onPick={(picked) => {
            goTo(picked);
            setPicking(false);
          }}
          onBack={() => setPicking(false)}
        />
      )}
    </View>
  );
}

type GameProps = { level: number; onBack: () => void; onLevels: () => void; onNext: () => void; onWin: () => void };

function HanoiGame({ level, onBack, onLevels, onNext, onWin }: GameProps) {
  const disks = disksForLevel(level);
  const history = useHistory(() => createHanoi(disks));
  const [selected, setSelected] = useState<number | null>(null);

  const state = history.current;
  const { moves } = history;
  const solved = isHanoiSolved(state, disks);

  const press = (peg: number) => {
    if (solved) return;
    if (selected === null) {
      if (!state[peg].length) return;
      setSelected(peg);
      feedback.pick();
    } else if (selected === peg) {
      setSelected(null);
    } else if (canMoveDisk(state, selected, peg)) {
      const after = moveDisk(state, selected, peg);
      history.push(after);
      if (!isHanoiSolved(after, disks)) feedback.drop();
      AccessibilityInfo.announceForAccessibility(`Moved disk ${state[selected].at(-1)} to the ${PEG_NAMES[peg]} peg`);
      setSelected(null);
    } else {
      setSelected(peg);
      feedback.pick();
    }
  };

  const drop = (peg: number) => {
    if (selected !== null && canMoveDisk(state, selected, peg)) press(peg);
    else setSelected(null);
  };

  const optimal = minMoves(disks);

  return (
    <GameShell
      title="Tower Stack"
      label={`Level ${level}`}
      moves={moves}
      message={`Move all ${disks} disks to another peg`}
      onBack={onBack}
      onLevels={onLevels}
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
      scoring={{ game: 'hanoi', key: level, optimal }}
      nextLabel={level >= HANOI_MAX_LEVEL ? 'Play again from level 1' : 'Next level'}
      onNext={onNext}
      onWin={onWin}
    >
      <HanoiBoard state={state} disks={disks} selected={selected} onPress={press} onDrop={drop} />
      <RodButtons
        labels={state.map((_, peg) => pegLabel(state, peg))}
        rowSizes={[state.length]}
        selected={selected}
        onPress={press}
      />
    </GameShell>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
