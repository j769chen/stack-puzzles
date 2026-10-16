import { StyleSheet, Text } from 'react-native';
import { MAX_STARS } from '../stars';
import { themedStyles } from '../theme';

export function Stars({ count, size = 40 }: { count: number; size?: number }) {
  const styles = useStyles();
  return (
    <Text style={{ fontSize: size, letterSpacing: size * 0.15 }} accessibilityLabel={`${count} of ${MAX_STARS} stars`}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <Text key={i} style={i < count ? styles.filled : styles.empty}>
          {i < count ? '★' : '☆'}
        </Text>
      ))}
    </Text>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    filled: { color: colors.star },
    empty: { color: colors.muted },
  }),
);
