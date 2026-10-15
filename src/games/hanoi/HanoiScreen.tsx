import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { GameShell } from '../../components/GameShell';
import { LevelSelect } from '../../components/LevelSelect';
import { RodButtons } from '../../components/RodButtons';
import { feedback } from '../../feedback';
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
  const { level, unlocked, stars, goTo, loaded } = useProgress('hanoi', HANOI_MAX_LEVEL);
  const [picking, setPicking] = useState(false);
  if (!loaded) return null;
  return (
    <View style={styles.root}>
      <HanoiGame
        key={level}
        level={level}
        onBack={onBack}
        onLevels={() => setPicking(true)}
        onNext={() => goTo(level >= HANOI_MAX_LEVEL ? 1 : level + 1)}
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

type GameProps = { level: number; onBack: () => void; onLevels: () => void; onNext: () => void };

function HanoiGame({ level, onBack, onLevels, onNext }: GameProps) {
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

  const optimal = minMoves(disks);

  return (
    <GameShell
      game="hanoi"
      title="Tower Stack"
      level={level}
      moves={moves}
      message={`Move all ${disks} disks to another peg · best ${optimal}`}
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
      optimal={optimal}
      nextLabel={level >= HANOI_MAX_LEVEL ? 'Play again from level 1' : 'Next level'}
      onNext={onNext}
    >
      <HanoiBoard state={state} disks={disks} selected={selected} onPress={press} />
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
