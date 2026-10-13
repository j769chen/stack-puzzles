import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GameShell } from '../../components/GameShell';
import { theme } from '../../theme';
import { usePersistentNumber } from '../../usePersistentNumber';
import {
  HANOI_MAX_LEVEL,
  type HanoiState,
  type Move,
  canMoveDisk,
  createHanoi,
  disksForLevel,
  isHanoiSolved,
  minMoves,
  moveDisk,
  nextHanoiMove,
} from './logic';

const DISK_COLORS = ['#E4572E', '#F3A712', '#A8C686', '#2A9D8F', '#669BBC', '#29335C', '#6D597A', '#B5838D', '#E9C46A', '#264653'];
const PEG_LABELS = ['A', 'B', 'C'];

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
  const [history, setHistory] = useState<HanoiState[]>(() => [createHanoi(disks)]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const { width } = useWindowDimensions();

  const state = history[history.length - 1];
  const moves = history.length - 1;
  const solved = isHanoiSolved(state, disks);

  const pegW = (Math.min(width, 560) - 32) / 3;
  const diskH = disks <= 6 ? 26 : disks <= 8 ? 22 : 18;
  const areaH = (disks + 2) * diskH;
  const minDiskW = pegW * 0.3;
  const diskWidth = (size: number) => minDiskW + ((pegW - 10 - minDiskW) * (size - 1)) / Math.max(disks - 1, 1);

  const reset = () => {
    setSelected(null);
    setHint(null);
  };

  const press = (peg: number) => {
    if (solved) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selected === null) {
      if (state[peg].length) setSelected(peg);
    } else if (selected === peg) {
      setSelected(null);
    } else if (canMoveDisk(state, selected, peg)) {
      setHistory((h) => [...h, moveDisk(state, selected, peg)]);
      reset();
    } else {
      setSelected(state[peg].length ? peg : null);
    }
  };

  const optimal = minMoves(disks);
  const message = hint
    ? `Move peg ${PEG_LABELS[hint[0]]} → peg ${PEG_LABELS[hint[1]]}`
    : `Move all ${disks} disks to another peg · best ${optimal}`;

  return (
    <GameShell
      title="Tower Stack"
      level={level}
      moves={moves}
      message={message}
      onBack={onBack}
      onUndo={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
        reset();
      }}
      canUndo={moves > 0}
      onRestart={() => {
        setHistory([createHanoi(disks)]);
        reset();
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
      <View style={styles.row}>
        {state.map((peg, i) => {
          const lifted = selected === i ? peg[peg.length - 1] : undefined;
          const resting = lifted === undefined ? peg : peg.slice(0, -1);
          return (
            <Pressable
              key={i}
              onPress={() => press(i)}
              style={[
                styles.peg,
                { width: pegW },
                hint?.[0] === i && { backgroundColor: theme.hintFrom },
                hint?.[1] === i && { backgroundColor: theme.hintTo },
              ]}
            >
              <View style={[styles.area, { height: areaH }]}>
                <View style={[styles.pole, { height: areaH - diskH * 1.5 }]} />
                {resting.map((size) => (
                  <Disk key={size} size={size} width={diskWidth(size)} height={diskH} />
                ))}
                {lifted !== undefined && (
                  <>
                    <View style={styles.spacer} />
                    <Disk size={lifted} width={diskWidth(lifted)} height={diskH} />
                  </>
                )}
              </View>
              <View style={styles.base} />
              <Text style={styles.label}>{PEG_LABELS[i]}</Text>
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}

function Disk({ size, width, height }: { size: number; width: number; height: number }) {
  return (
    <View
      style={[
        styles.disk,
        {
          width,
          height: height - 4,
          borderRadius: (height - 4) / 2,
          backgroundColor: DISK_COLORS[(size - 1) % DISK_COLORS.length],
        },
      ]}
    >
      <View style={styles.shine} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  peg: { alignItems: 'center', paddingTop: 8, borderRadius: 16 },
  area: { width: '100%', alignItems: 'center', flexDirection: 'column-reverse' },
  pole: { position: 'absolute', bottom: 0, width: 10, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: theme.pole },
  spacer: { flex: 1 },
  base: { width: '92%', height: 12, borderRadius: 6, backgroundColor: theme.base },
  label: { marginTop: 6, marginBottom: 6, fontWeight: '700', color: theme.muted },
  disk: { marginVertical: 2, borderWidth: 2, borderColor: 'rgba(0,0,0,0.18)', overflow: 'hidden' },
  shine: { position: 'absolute', top: 2, left: '12%', right: '12%', height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.45)' },
});
