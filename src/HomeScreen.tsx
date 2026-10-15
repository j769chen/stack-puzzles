import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateSettings, useSettings } from './settings';
import { totalStars, useStars } from './stars';
import { theme } from './theme';
import { usePersistentNumber } from './usePersistentNumber';

type Props = { onOpen: (game: 'hanoi' | 'hoops') => void };

export function HomeScreen({ onOpen }: Props) {
  const [hanoiLevel, , hanoiLoaded] = usePersistentNumber('hanoi.level', 1);
  const [hoopLevel, , hoopLoaded] = usePersistentNumber('hoops.level', 1);
  const hanoiStars = totalStars(useStars('hanoi'));
  const hoopStars = totalStars(useStars('hoops'));
  const settings = useSettings();

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title} accessibilityRole="header">
        Stack Puzzles
      </Text>
      <Text style={styles.subtitle}>Two classic stacking puzzles</Text>

      <GameCard
        title="Tower Stack"
        description="Move the whole tower to another peg. A disk can never sit on a smaller one."
        level={hanoiLoaded ? hanoiLevel : null}
        stars={hanoiStars}
        chips={[
          { color: theme.disks[0], width: 30 },
          { color: theme.disks[1], width: 44 },
          { color: theme.disks[3], width: 58 },
        ]}
        onPress={() => onOpen('hanoi')}
      />
      <GameCard
        title="Ring Sort"
        description="Sort the colored rings so every rod holds a single color."
        level={hoopLoaded ? hoopLevel : null}
        stars={hoopStars}
        chips={[theme.rings[0], theme.rings[5], theme.rings[2]].map((color) => ({ color, width: 44 }))}
        onPress={() => onOpen('hoops')}
      />

      <View style={styles.settings}>
        <SettingRow label="Sound" value={settings.sound} onChange={(sound) => updateSettings({ sound })} />
        <SettingRow label="Haptics" value={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
      </View>
    </SafeAreaView>
  );
}

type SettingProps = { label: string; value: boolean; onChange: (value: boolean) => void };

function SettingRow({ label, value, onChange }: SettingProps) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: theme.accent, false: theme.border }}
      />
    </View>
  );
}

type Chip = { color: string; width: number };

type CardProps = {
  title: string;
  description: string;
  level: number | null;
  stars: number;
  chips: Chip[];
  onPress: () => void;
};

function GameCard({ title, description, level, stars, chips, onPress }: CardProps) {
  let label = title;
  if (level !== null) label += `, level ${level}`;
  if (stars > 0) label += `, ${stars} ${stars === 1 ? 'star' : 'stars'}`;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
    >
      <View style={styles.preview}>
        {chips.map(({ color, width }) => (
          <View key={color} style={[styles.chip, { backgroundColor: color, width }]} />
        ))}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardLevel}>{level === null ? ' ' : `Level ${level} ›`}</Text>
          {stars > 0 && <Text style={styles.cardStars}>{`★ ${stars}`}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 34, fontWeight: '900', color: theme.ink, marginTop: 24 },
  subtitle: { fontSize: 16, color: theme.muted, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 18,
    gap: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  preview: { width: 70, alignItems: 'center', gap: 4 },
  chip: { height: 14, borderRadius: 7 },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: theme.ink },
  cardText: { fontSize: 14, color: theme.muted, lineHeight: 19 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardLevel: { fontSize: 15, fontWeight: '700', color: theme.accent },
  cardStars: { fontSize: 15, fontWeight: '700', color: theme.muted },
  settings: { backgroundColor: theme.card, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 6, marginTop: 8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: theme.ink },
});
