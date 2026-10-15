import { StyleSheet, Text } from 'react-native';
import { MAX_STARS } from '../stars';
import { theme } from '../theme';

export function Stars({ count }: { count: number }) {
  return (
    <Text style={styles.row} accessibilityLabel={`${count} of ${MAX_STARS} stars`}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <Text key={i} style={i < count ? styles.filled : styles.empty}>
          ★
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { fontSize: 40, letterSpacing: 6 },
  filled: { color: theme.done },
  empty: { color: theme.border },
});
