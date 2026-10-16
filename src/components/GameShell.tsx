import { type ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { themedStyles } from '../theme';
import { feedback } from '../feedback';
import { type Game, recordStars, starsFor } from '../stars';
import { Button } from './Button';
import { Stars } from './Stars';

type Scoring = { game: Game; key: number; optimal: number };

export type GameShellProps = {
  title: string;
  label: string;
  moves: number;
  message?: string | null;
  onBack: () => void;
  onLevels?: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onRestart: () => void;
  won: boolean;
  scoring?: Scoring;
  nextLabel: string;
  onNext: () => void;
  onWinShown?: () => void;
  children: ReactNode;
};

export function GameShell(props: GameShellProps) {
  const styles = useStyles();
  const [winDelayPassed, setWinDelayPassed] = useState(false);
  const showWin = props.won && winDelayPassed;
  const { scoring, moves } = props;
  const stars = scoring ? starsFor(moves, scoring.optimal) : null;
  let winText = `Sorted in ${moves} moves.`;
  if (scoring && stars === 3) winText = `Perfect! ${moves} moves, the minimum possible.`;
  else if (scoring) winText = `${moves} moves. Solve it in ${scoring.optimal} for three stars.`;
  const announcement = stars === null ? `Solved! ${winText}` : `Solved! ${stars} of 3 stars. ${winText}`;

  useEffect(() => {
    if (!props.won) return;
    feedback.win();
    const timer = setTimeout(() => setWinDelayPassed(true), 650);
    return () => {
      clearTimeout(timer);
      setWinDelayPassed(false);
    };
  }, [props.won]);

  const { won } = props;
  const game = scoring?.game;
  const key = scoring?.key;
  useEffect(() => {
    if (won && game && key !== undefined && stars !== null) recordStars(game, key, stars);
  }, [won, game, key, stars]);

  useEffect(() => {
    if (showWin) AccessibilityInfo.announceForAccessibility(announcement);
  }, [showWin, announcement]);

  const { onWinShown } = props;
  useEffect(() => {
    if (showWin) onWinShown?.();
  }, [showWin, onWinShown]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={props.onBack}
          hitSlop={12}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {props.title}
        </Text>
        {props.onLevels ? (
          <Pressable
            onPress={props.onLevels}
            hitSlop={12}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Levels"
          >
            <Text style={[styles.backText, styles.levelsText]}>Levels</Text>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.stats}>
          <Text style={styles.stat}>{props.label}</Text>
          {scoring ? (
            <>
              <Text style={[styles.stat, moves > scoring.optimal && styles.over]}>
                {`Moves ${moves}/${scoring.optimal}`}
              </Text>
              <Stars count={stars ?? 0} size={18} />
            </>
          ) : (
            <Text style={styles.stat}>{`Moves ${moves}`}</Text>
          )}
        </View>

        <View style={styles.board}>{props.children}</View>

        <Text style={styles.message} accessibilityLiveRegion="polite">
          {props.message ?? ' '}
        </Text>

        <View style={styles.controls}>
          <Button label="Undo" onPress={props.onUndo} disabled={!props.canUndo || props.won} />
          <Button label="Restart" onPress={props.onRestart} />
        </View>

        {showWin && (
          <View style={styles.overlay} accessibilityViewIsModal>
            <View style={styles.winCard}>
              <Text style={styles.winTitle} accessibilityRole="header">
                Solved!
              </Text>
              {stars !== null && <Stars count={stars} />}
              <Text style={styles.winText}>{winText}</Text>
              <Button label={props.nextLabel} onPress={props.onNext} primary />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    body: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    back: { width: 70 },
    backText: { fontSize: 17, fontWeight: '600', color: colors.accent },
    levelsText: { textAlign: 'right' },
    title: { fontSize: 20, fontWeight: '800', color: colors.ink },
    stats: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 12 },
    stat: { fontSize: 16, fontWeight: '600', color: colors.muted },
    over: { color: colors.danger },
    board: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
    message: { textAlign: 'center', fontSize: 15, color: colors.muted, marginBottom: 12, minHeight: 20 },
    controls: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingBottom: 16 },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    winCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 28,
      width: '80%',
      maxWidth: 360,
      alignItems: 'center',
      gap: 14,
    },
    winTitle: { fontSize: 30, fontWeight: '900', color: colors.ink },
    winText: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  }),
);
