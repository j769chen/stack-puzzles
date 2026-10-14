import { Pressable, StyleSheet, View } from 'react-native';
import { useScreenReader } from '../useScreenReader';

type Props = {
  labels: string[];
  rowSizes: number[];
  selected: number | null;
  onPress: (rod: number) => void;
};

export function RodButtons({ labels, rowSizes, selected, onPress }: Props) {
  const screenReader = useScreenReader();
  if (!screenReader) return null;

  const rowStarts = rowSizes.map((_, r) => rowSizes.slice(0, r).reduce((a, b) => a + b, 0));
  const hint = (i: number) => (selected === null ? 'Picks up the top' : selected === i ? 'Puts it back' : 'Moves here');

  return (
    <View style={styles.overlay}>
      {rowSizes.map((size, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: size }, (_, k) => {
            const i = rowStarts[r] + k;
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
  overlay: { ...StyleSheet.absoluteFillObject },
  row: { flex: 1, flexDirection: 'row' },
  rod: { flex: 1 },
});
