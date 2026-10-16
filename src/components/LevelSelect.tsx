import { useEffect } from 'react';
import { BackHandler, FlatList, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type LevelStars, MAX_STARS } from '../stars';
import { themedStyles } from '../theme';
import { Header } from './Header';
import { Stars } from './Stars';

const COLUMNS = 4;
const CELL_HEIGHT = 76;
const MAX_CELL_FONT_SCALE = 1.5;
const GAP = 12;
const SIDE = 16;

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

  const { width, fontScale } = useWindowDimensions();
  const cellWidth = (width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const cellHeight = Math.round(CELL_HEIGHT * Math.min(Math.max(fontScale, 1), MAX_CELL_FONT_SCALE));
  const rowHeight = cellHeight + GAP;
  const levels = Array.from({ length: count }, (_, i) => i + 1);
  const currentRow = Math.floor((current - 1) / COLUMNS);

  return (
    <SafeAreaView style={styles.root} accessibilityViewIsModal>
      <Header title={title} onBack={onBack} />
      <FlatList
        data={levels}
        keyExtractor={(level) => String(level)}
        numColumns={COLUMNS}
        initialScrollIndex={Math.min(Math.max(currentRow - 1, 0), Math.ceil(count / COLUMNS) - 1)}
        getItemLayout={(_, row) => ({ length: rowHeight, offset: rowHeight * row, index: row })}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item: level }) => (
          <LevelCell
            level={level}
            width={cellWidth}
            height={cellHeight}
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
  height: number;
  stars: number | null;
  locked: boolean;
  current: boolean;
  onPress: () => void;
};

function LevelCell({ level, width, height, stars, locked, current, onPress }: CellProps) {
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
        { width, height },
        current && styles.current,
        locked && styles.locked,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.number} maxFontSizeMultiplier={MAX_CELL_FONT_SCALE}>
        {level}
      </Text>
      {stars !== null && <Stars count={stars} size={14} maxFontSizeMultiplier={MAX_CELL_FONT_SCALE} />}
    </Pressable>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    root: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
    grid: { paddingHorizontal: SIDE, paddingTop: 12, paddingBottom: SIDE },
    row: { gap: GAP, marginBottom: GAP },
    cell: {
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
