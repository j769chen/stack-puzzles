import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { themedStyles } from '../theme';
import { Button } from './Button';

type Props = { onBack: () => void; children: ReactNode };

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <Failed onBack={this.props.onBack} /> : this.props.children;
  }
}

function Failed({ onBack }: { onBack: () => void }) {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          Something went wrong
        </Text>
        <Text style={styles.text}>This puzzle couldn&apos;t be shown. Your saved progress is untouched.</Text>
        <Button label="Back to home" onPress={onBack} primary />
      </View>
    </SafeAreaView>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, textAlign: 'center' },
    text: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  }),
);
