import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { themedStyles, useColors } from '../theme';
import { Header } from './Header';

export function LoadingScreen({ title, onBack }: { title: string; onBack: () => void }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <SafeAreaView style={styles.root}>
      <Header title={title} onBack={onBack} />
      <View style={styles.body}>
        <ActivityIndicator size="large" color={colors.accent} accessibilityLabel="Loading" />
      </View>
    </SafeAreaView>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  }),
);
