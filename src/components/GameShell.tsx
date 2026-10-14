import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Button } from './Button';

type Props = {
  title: string;
  level: number;
  moves: number;
  message?: string | null;
  onBack: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onRestart: () => void;
  onHint: () => void;
  won: boolean;
  winText: string;
  nextLabel: string;
  onNext: () => void;
  children: ReactNode;
};

export function GameShell(props: Props) {
  const [showWin, setShowWin] = useState(false);

  useEffect(() => {
    setShowWin(false);
    if (!props.won) return;
    const timer = setTimeout(() => setShowWin(true), 650);
    return () => clearTimeout(timer);
  }, [props.won]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={props.onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>{props.title}</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.stats}>
        <Text style={styles.stat}>Level {props.level}</Text>
        <Text style={styles.stat}>Moves {props.moves}</Text>
      </View>

      <View style={styles.board}>{props.children}</View>

      <Text style={styles.message}>{props.message ?? ' '}</Text>

      <View style={styles.controls}>
        <Button label="Undo" onPress={props.onUndo} disabled={!props.canUndo || props.won} />
        <Button label="Restart" onPress={props.onRestart} />
        <Button label="Hint" onPress={props.onHint} disabled={props.won} />
      </View>

      {showWin && (
        <View style={styles.overlay}>
          <View style={styles.winCard}>
            <Text style={styles.winTitle}>Solved!</Text>
            <Text style={styles.winText}>{props.winText}</Text>
            <Button label={props.nextLabel} onPress={props.onNext} primary />
            <Button label="Menu" onPress={props.onBack} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  back: { width: 70 },
  backText: { fontSize: 17, fontWeight: '600', color: theme.accent },
  title: { fontSize: 20, fontWeight: '800', color: theme.ink },
  stats: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12 },
  stat: { fontSize: 16, fontWeight: '600', color: theme.muted },
  board: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  message: { textAlign: 'center', fontSize: 15, color: theme.muted, marginBottom: 12, minHeight: 20 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingBottom: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 28,
    width: '80%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
  },
  winTitle: { fontSize: 30, fontWeight: '900', color: theme.ink },
  winText: { fontSize: 16, color: theme.muted, textAlign: 'center' },
});
