import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from './theme';
import { usePersistentNumber } from './usePersistentNumber';

type Props = { onOpen: (game: 'hanoi' | 'hoops') => void };

export function HomeScreen({ onOpen }: Props) {
  const [hanoiLevel, , hanoiLoaded] = usePersistentNumber('hanoi.level', 1);
  const [hoopLevel, , hoopLoaded] = usePersistentNumber('hoops.level', 1);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title} accessibilityRole="header">
        Stack Puzzles
      </Text>
      <Text style={styles.subtitle}>Two classic stacking puzzles</Text>

      <GameCard
        title="Tower Stack"
        description="Move the whole tower to another peg. A disk can never sit on a smaller one."
        level={hanoiLoaded ? hanoiLevel : null}
        colors={[theme.disks[0], theme.disks[1], theme.disks[3]]}
        onPress={() => onOpen('hanoi')}
      />
      <GameCard
        title="Ring Sort"
        description="Sort the colored rings so every rod holds a single color."
        level={hoopLoaded ? hoopLevel : null}
        colors={[theme.rings[0], theme.rings[5], theme.rings[2]]}
        onPress={() => onOpen('hoops')}
      />
    </SafeAreaView>
  );
}

type CardProps = { title: string; description: string; level: number | null; colors: string[]; onPress: () => void };

function GameCard({ title, description, level, colors, onPress }: CardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={level === null ? title : `${title}, level ${level}`}
      accessibilityHint={description}
    >
      <View style={styles.preview}>
        {colors.map((c, i) => (
          <View key={c} style={[styles.chip, { backgroundColor: c, width: 30 + i * 14 }]} />
        ))}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{description}</Text>
        <Text style={styles.cardLevel}>{level === null ? ' ' : `Level ${level} ›`}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 34, fontWeight: '900', color: theme.ink, marginTop: 24 },
  subtitle: { fontSize: 16, color: theme.muted, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 18,
    gap: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  preview: { width: 70, alignItems: 'center', gap: 4 },
  chip: { height: 14, borderRadius: 7 },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: theme.ink },
  cardText: { fontSize: 14, color: theme.muted, lineHeight: 19 },
  cardLevel: { fontSize: 15, fontWeight: '700', color: theme.accent, marginTop: 4 },
});
