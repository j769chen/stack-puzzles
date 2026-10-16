import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export function WithOverlay({ overlay, children }: { overlay: ReactNode; children: ReactNode }) {
  const covered = Boolean(overlay);
  return (
    <View style={styles.fill}>
      <View
        style={styles.fill}
        importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={covered}
      >
        {children}
      </View>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
