import { Pressable, StyleSheet, Text, View } from 'react-native';
import { themedStyles } from '../theme';

type Props = {
  title: string;
  onBack: () => void;
  action?: { label: string; onPress: () => void };
};

export function Header({ title, onBack, action }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.side} accessibilityRole="button" accessibilityLabel="Back">
        <Text style={styles.link}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={12}
          style={styles.side}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={[styles.link, styles.actionText]}>{action.label}</Text>
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}
    </View>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    side: { flex: 1 },
    link: { fontSize: 17, fontWeight: '600', color: colors.accent },
    actionText: { textAlign: 'right' },
    title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  }),
);
