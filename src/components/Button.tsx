import { Pressable, StyleSheet, Text } from 'react-native';
import { themedStyles } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
};

export function Button({ label, onPress, disabled, primary }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primary,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, primary && styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    button: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    primary: { backgroundColor: colors.accent, borderColor: colors.accent },
    disabled: { opacity: 0.4 },
    pressed: { transform: [{ scale: 0.96 }] },
    label: { fontSize: 16, fontWeight: '700', color: colors.ink },
    primaryLabel: { color: colors.onAccent },
  }),
);
