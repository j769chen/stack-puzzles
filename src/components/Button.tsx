import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
};

export function Button({ label, onPress, disabled, primary }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
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

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 2,
    borderColor: '#E3DACB',
    alignItems: 'center',
  },
  primary: { backgroundColor: theme.accent, borderColor: theme.accent },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.96 }] },
  label: { fontSize: 16, fontWeight: '700', color: theme.ink },
  primaryLabel: { color: '#FFFFFF' },
});
