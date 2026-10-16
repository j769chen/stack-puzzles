import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LevelSelect } from '../../components/LevelSelect';
import { theme } from '../../theme';
import type { Rods } from '../hoops/logic';
import { RodSortGame, type SortRules } from '../hoops/RodSortGame';
import { useProgress } from '../useProgress';
import { canStack, isTowerComplete, ringColor, ringSize, towerLevel, towerSpec } from './logic';

function towerRules(sizes: number): SortRules {
  const colorName = (ring: number) => theme.ringNames[ringColor(ring, sizes)];
  const ringName = (ring: number) => `${colorName(ring)} ${ringSize(ring, sizes) + 1}`;
  return {
    capacity: sizes,
    sizes,
    goal: 'Sort each color onto its own rod. A ring only fits on a bigger one.',
    canPour: (rods, from, to) => canStack(rods, from, to, sizes),
    isRodComplete: (rod) => isTowerComplete(rod, sizes),
    ringName,
    rodLabel: (rods: Rods, rod: number) => {
      const rings = rods[rod];
      let contents = 'empty';
      if (isTowerComplete(rings, sizes)) contents = `complete, ${colorName(rings[0])}`;
      else if (rings.length) contents = `${rings.map(ringName).join(', ')} from the bottom`;
      return `Rod ${rod + 1}, ${contents}`;
    },
  };
}

export function TowerSortScreen({ onBack }: { onBack: () => void }) {
  const { level, unlocked, goTo, loaded } = useProgress('towersort');
  const [picking, setPicking] = useState(false);
  const start = useMemo(() => (loaded ? towerLevel(level) : null), [loaded, level]);
  const rules = useMemo(() => towerRules(towerSpec(level).sizes), [level]);
  const prepareNext = useCallback(() => towerLevel(level + 1), [level]);
  if (!start) return null;
  return (
    <View style={styles.root}>
      <RodSortGame
        key={level}
        start={start}
        rules={rules}
        title="Tower Sort"
        label={`Level ${level}`}
        onBack={onBack}
        onLevels={() => setPicking(true)}
        nextLabel="Next level"
        onNext={() => goTo(level + 1)}
        onWinShown={prepareNext}
      />
      {picking && (
        <LevelSelect
          title="Tower Sort"
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

const styles = StyleSheet.create({ root: { flex: 1 } });
