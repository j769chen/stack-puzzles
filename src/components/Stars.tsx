import { StyleSheet, Text } from 'react-native';
import { MAX_STARS } from '../stars';
import { theme } from '../theme';

export function Stars({ count, size = 40 }: { count: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, letterSpacing: size * 0.15 }} accessibilityLabel={`${count} of ${MAX_STARS} stars`}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <Text key={i} style={i < count ? styles.filled : styles.empty}>
          ★
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  filled: { color: theme.done },
  empty: { color: theme.border },
});
