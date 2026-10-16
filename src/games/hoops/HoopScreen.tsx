import { useCallback, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { GameShell, type GameShellProps } from '../../components/GameShell';
import { LevelSelect } from '../../components/LevelSelect';
import { RodButtons } from '../../components/RodButtons';
import { feedback } from '../../feedback';
import { theme } from '../../theme';
import { useHistory } from '../useHistory';
import { useProgress } from '../useProgress';
import {
  type Deal,
  type Rods,
  canPour,
  hasAnyMove,
  isHoopsSolved,
  isRodComplete,
  levelSpec,
  pour,
  topRun,
} from './logic';
import { loadDeal, useDeal } from './deals';
import { HoopBoard } from './HoopBoard';
import { rodRows } from './layout';

type Snapshot = { rods: Rods; ids: number[][] };

const colorName = (color: number) => theme.ringNames[color];

function rodLabel(rods: Rods, rod: number, capacity: number) {
  const rings = rods[rod];
  let contents = 'empty';
  if (isRodComplete(rings, capacity)) contents = `complete, ${colorName(rings[0])}`;
  else if (rings.length) {
    const top = `${topRun(rings)} ${colorName(rings[rings.length - 1])}`;
    contents = `${rings.map(colorName).join(', ')} from the bottom, top ${top}`;
  }
  return `Rod ${rod + 1}, ${contents}`;
}

export function HoopScreen({ onBack }: { onBack: () => void }) {
  const { level, unlocked, goTo, loaded } = useProgress('hoops');
  const [picking, setPicking] = useState(false);
  const deal = useDeal(loaded ? level : null);
  const prepareNext = useCallback(() => loadDeal(level + 1), [level]);
  if (!deal) return null;
  return (
    <View style={styles.root}>
      <RingSortGame
        key={level}
        deal={deal}
        capacity={levelSpec(level).capacity}
        title="Ring Sort"
        label={`Level ${level}`}
        onBack={onBack}
        onLevels={() => setPicking(true)}
        nextLabel="Next level"
        onNext={() => goTo(level + 1)}
        onWinShown={prepareNext}
      />
      {picking && (
        <LevelSelect
          title="Ring Sort"
          count={unlocked}
          unlocked={unlocked}
          current={level}
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

function createSnapshot(rods: Rods): Snapshot {
  let next = 0;
  return { rods, ids: rods.map((rod) => rod.map(() => next++)) };
}

function pourSnapshot({ rods, ids }: Snapshot, from: number, to: number): Snapshot {
  const nextIds = ids.map((r) => [...r]);
  nextIds[to].push(nextIds[from].pop()!);
  return { rods: pour(rods, from, to), ids: nextIds };
}

type GameProps = Pick<
  GameShellProps,
  'title' | 'label' | 'onBack' | 'onLevels' | 'scoring' | 'winNote' | 'onShare' | 'nextLabel' | 'onNext' | 'onWinShown'
> & { deal: Deal; capacity: number };

export function RingSortGame({ deal, capacity, ...shell }: GameProps) {
  const history = useHistory(() => createSnapshot(deal.rods));
  const [selected, setSelected] = useState<number | null>(null);

  const current = history.current;
  const { rods } = current;
  const { moves } = history;
  const solved = isHoopsSolved(rods, capacity);
  const stuck = !solved && !hasAnyMove(rods, capacity);
  const selectable = (rod: number) => rods[rod].length > 0 && !isRodComplete(rods[rod], capacity);

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
      setSelected(null);
    } else if (selectable(rod)) {
      setSelected(rod);
      feedback.pick();
    } else {
      setSelected(null);
    }
  };

  const message = stuck ? 'No moves left. Undo or restart.' : 'Sort each color onto its own rod';

  return (
    <GameShell
      {...shell}
      moves={moves}
      message={message}
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
      <HoopBoard rods={rods} capacity={capacity} ids={current.ids} selected={selected} onPress={press} />
      <RodButtons
        labels={rods.map((_, rod) => rodLabel(rods, rod, capacity))}
        rowSizes={rodRows(rods.length)}
        selected={selected}
        onPress={press}
      />
    </GameShell>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
