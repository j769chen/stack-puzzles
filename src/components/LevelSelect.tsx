import { useEffect } from 'react';
import { BackHandler, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type LevelStars, MAX_STARS } from '../stars';
import { themedStyles } from '../theme';
import { Stars } from './Stars';

const COLUMNS = 4;
const CELL_HEIGHT = 76;
const GAP = 12;
const SIDE = 16;
const ROW_HEIGHT = CELL_HEIGHT + GAP;

type Props = {
  title: string;
  count: number;
  unlocked: number;
  current: number;
  stars?: LevelStars;
  onPick: (level: number) => void;
  onBack: () => void;
};

export function LevelSelect({ title, count, unlocked, current, stars, onPick, onBack }: Props) {
  const styles = useStyles();
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const { width } = useWindowDimensions();
  const cellWidth = (width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const levels = Array.from({ length: count }, (_, i) => i + 1);
  const currentRow = Math.floor((current - 1) / COLUMNS);

  return (
    <SafeAreaView style={styles.root} accessibilityViewIsModal>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={styles.side}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.side} />
      </View>
      <FlatList
        data={levels}
        keyExtractor={(level) => String(level)}
        numColumns={COLUMNS}
        initialScrollIndex={Math.min(Math.max(currentRow - 1, 0), Math.ceil(count / COLUMNS) - 1)}
        getItemLayout={(_, row) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * row, index: row })}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item: level }) => (
          <LevelCell
            level={level}
            width={cellWidth}
            stars={stars ? (stars[level] ?? 0) : null}
            locked={level > unlocked}
            current={level === current}
            onPress={() => onPick(level)}
          />
        )}
      />
    </SafeAreaView>
  );
}

type CellProps = {
  level: number;
  width: number;
  stars: number | null;
  locked: boolean;
  current: boolean;
  onPress: () => void;
};

function LevelCell({ level, width, stars, locked, current, onPress }: CellProps) {
  const styles = useStyles();
  let label = `Level ${level}`;
  if (locked) label += ', locked';
  else if (stars !== null) label += stars ? `, ${stars} of ${MAX_STARS} stars` : ', not solved';
  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: locked, selected: current }}
      style={({ pressed }) => [
        styles.cell,
        { width },
        current && styles.current,
        locked && styles.locked,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.number}>{level}</Text>
      {stars !== null && <Stars count={stars} size={14} />}
    </Pressable>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    root: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    side: { width: 70 },
    backText: { fontSize: 17, fontWeight: '600', color: colors.accent },
    title: { fontSize: 20, fontWeight: '800', color: colors.ink },
    grid: { paddingHorizontal: SIDE, paddingBottom: SIDE },
    row: { gap: GAP, marginBottom: GAP },
    cell: {
      height: CELL_HEIGHT,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    current: { borderColor: colors.accent },
    locked: { opacity: 0.4 },
    pressed: { transform: [{ scale: 0.96 }] },
    number: { fontSize: 22, fontWeight: '800', color: colors.ink },
  }),
);
