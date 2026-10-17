import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { themedStyles } from '../theme';
import { feedback } from '../feedback';
import { type Game, recordStars, starsFor } from '../stars';
import { Button } from './Button';
import { Header } from './Header';
import { Stars } from './Stars';
import { WithOverlay } from './WithOverlay';

type Scoring = { game: Game; key: number; optimal: number };

export type GameShellProps = {
  title: string;
  label: string;
  moves: number;
  message?: string | null;
  onBack: () => void;
  onLevels?: () => void;
  levelsLabel?: string;
  onUndo: () => void;
  canUndo: boolean;
  onRestart: () => void;
  won: boolean;
  scoring?: Scoring;
  winNote?: string | null;
  onShare?: (moves: number) => void;
  nextLabel: string;
  onNext: () => void;
  onWin?: () => void;
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

  const leave = () => {
    if (moves === 0 || props.won) {
      props.onBack();
      return;
    }
    Alert.alert('Leave this puzzle?', 'Your moves so far will be lost.', [
      { text: 'Keep playing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: props.onBack },
    ], { cancelable: true });
  };
  const onHardwareBack = useEffectEvent(leave);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onHardwareBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const { message } = props;
  const announcedMessage = useRef(message);
  useEffect(() => {
    if (message === announcedMessage.current) return;
    announcedMessage.current = message;
    if (message) AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  }, [message]);

  const { won } = props;
  const handleWin = useEffectEvent(() => props.onWin?.());
  useEffect(() => {
    if (won) handleWin();
  }, [won]);

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

  const winCard = showWin && (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.winCard}>
        <Text style={styles.winTitle} accessibilityRole="header">
          Solved!
        </Text>
        {stars !== null && <Stars count={stars} />}
        <Text style={styles.winText}>{winText}</Text>
        {props.winNote && <Text style={styles.winNote}>{props.winNote}</Text>}
        {props.onShare && <Button label="Share" onPress={() => props.onShare?.(moves)} />}
        <Button label={props.nextLabel} onPress={props.onNext} primary />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <Header
        title={props.title}
        onBack={leave}
        action={props.onLevels && { label: props.levelsLabel ?? 'Levels', onPress: props.onLevels }}
      />

      <WithOverlay overlay={winCard}>
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

        <Text style={styles.message}>{props.message ?? ' '}</Text>

        <View style={styles.controls}>
          <Button label="Undo" onPress={props.onUndo} disabled={!props.canUndo || props.won} />
          <Button label="Restart" onPress={props.onRestart} />
        </View>
      </WithOverlay>
    </SafeAreaView>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
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
    winNote: { fontSize: 16, fontWeight: '700', color: colors.accent },
  }),
);
