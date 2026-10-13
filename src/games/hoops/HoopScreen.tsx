import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GameShell } from '../../components/GameShell';
import { theme } from '../../theme';
import { usePersistentNumber } from '../../usePersistentNumber';
import {
  CAPACITY,
  type Move,
  type Rods,
  canPour,
  generateLevel,
  hasAnyMove,
  isHoopsSolved,
  isRodComplete,
  liftCount,
  pour,
  solveHoops,
} from './logic';

const RING_COLORS = ['#E63946', '#F4A261', '#F6D743', '#4CAF50', '#2A9D8F', '#457B9D', '#8E44AD', '#FF7EB6', '#8D6E63', '#1D3557'];

export function HoopScreen({ onBack }: { onBack: () => void }) {
  const [level, setLevel, loaded] = usePersistentNumber('hoops.level', 1);
  if (!loaded) return null;
  return <HoopGame key={level} level={level} onBack={onBack} onNext={() => setLevel(level + 1)} />;
}

type GameProps = { level: number; onBack: () => void; onNext: () => void };

function HoopGame({ level, onBack, onNext }: GameProps) {
  const [start] = useState(() => generateLevel(level));
  const [history, setHistory] = useState<Rods[]>([start]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Move | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<Move[] | null>(null);
  const { width } = useWindowDimensions();

  const rods = history[history.length - 1];
  const moves = history.length - 1;
  const solved = isHoopsSolved(rods);
  const stuck = !solved && !hasAnyMove(rods);

  const perRow = rods.length <= 6 ? rods.length : Math.ceil(rods.length / 2);
  const rodW = (Math.min(width, 560) - 32) / perRow;
  const ringW = Math.min(rodW - 10, 78);
  const ringH = rods.length <= 6 ? 30 : 24;
  const areaH = (CAPACITY + 1.6) * ringH;
  const rows = [rods.slice(0, perRow), rods.slice(perRow)].filter((r) => r.length);

  const reset = () => {
    setSelected(null);
    setHint(null);
    setHintMessage(null);
  };

  const press = (rod: number) => {
    if (solved) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selected === null) {
      if (rods[rod].length && !isRodComplete(rods[rod])) setSelected(rod);
    } else if (selected === rod) {
      setSelected(null);
    } else if (canPour(rods, selected, rod)) {
      setHistory((h) => [...h, pour(rods, selected, rod)]);
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
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      <View style={styles.rows}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((rod, j) => {
              const i = r * perRow + j;
              const lift = selected === i ? liftCount(rods, i) : 0;
              const resting = rod.slice(0, rod.length - lift);
              const lifted = rod.slice(rod.length - lift);
              const complete = isRodComplete(rod);
              return (
                <Pressable
                  key={i}
                  onPress={() => press(i)}
                  style={[
                    styles.rod,
                    { width: rodW },
                    hint?.[0] === i && { backgroundColor: theme.hintFrom },
                    hint?.[1] === i && { backgroundColor: theme.hintTo },
                  ]}
                >
                  <View style={[styles.area, { height: areaH + (lift ? lift - 1 : 0) * ringH }]}>
                    <View
                      style={[
                        styles.pole,
                        { height: CAPACITY * ringH + 12 },
                        complete && { backgroundColor: theme.done },
                      ]}
                    />
                    {resting.map((c, k) => (
                      <Ring key={`r${k}`} color={c} width={ringW} height={ringH} />
                    ))}
                    {lift > 0 && <View style={styles.spacer} />}
                    {lifted.map((c, k) => (
                      <Ring key={`l${k}`} color={c} width={ringW} height={ringH} />
                    ))}
                  </View>
                  <View style={[styles.base, complete && { backgroundColor: theme.done }]} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </GameShell>
  );
}

function Ring({ color, width, height }: { color: number; width: number; height: number }) {
  return (
    <View
      style={[
        styles.ring,
        { width, height: height - 3, borderRadius: height / 2.6, backgroundColor: RING_COLORS[color] },
      ]}
    >
      <View style={styles.hole} />
      <View style={styles.shine} />
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 18 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
  rod: { alignItems: 'center', paddingTop: 6, paddingBottom: 8, borderRadius: 16 },
  area: { width: '100%', alignItems: 'center', flexDirection: 'column-reverse' },
  pole: { position: 'absolute', bottom: 0, width: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: theme.pole },
  spacer: { flex: 1 },
  base: { width: '80%', height: 10, borderRadius: 5, backgroundColor: theme.base },
  ring: { marginVertical: 1.5, borderWidth: 2, borderColor: 'rgba(0,0,0,0.2)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  hole: { width: 10, height: '100%', backgroundColor: 'rgba(0,0,0,0.12)' },
  shine: { position: 'absolute', top: 2, left: '15%', right: '15%', height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
});
