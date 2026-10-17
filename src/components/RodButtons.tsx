import { Pressable, StyleSheet, View } from 'react-native';
import { useScreenReader } from '../useScreenReader';

type Props = {
  labels: string[];
  rowSizes: number[];
  selected: number | null;
  canMoveTo: (rod: number) => boolean;
  onPress: (rod: number) => void;
};

export function RodButtons({ labels, rowSizes, selected, canMoveTo, onPress }: Props) {
  const screenReader = useScreenReader();
  if (!screenReader) return null;

  const rowStarts = rowSizes.map((_, r) => rowSizes.slice(0, r).reduce((a, b) => a + b, 0));
  const hint = (i: number) => {
    if (selected === null) return 'Picks up the top';
    if (selected === i) return 'Puts it back';
    return canMoveTo(i) ? 'Moves here' : "Can't move here";
  };

  return (
    <View style={styles.overlay}>
      {rowSizes.map((size, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: size }, (_, k) => {
            const i = rowStarts[r]! + k;
            return (
              <Pressable
                key={i}
                style={styles.rod}
                accessibilityRole="button"
                accessibilityLabel={labels[i]}
                accessibilityHint={hint(i)}
                accessibilityState={{ selected: selected === i }}
                onPress={() => onPress(i)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill },
  row: { flex: 1, flexDirection: 'row' },
  rod: { flex: 1 },
});
