import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateSettings, useSettings } from './settings';
import { dailyStreak } from './daily';
import { dailyKey } from './games/hoops/logic';
import { totalStars, useStars } from './stars';
import { theme, themedStyles, useColors } from './theme';
import { usePersistentNumber } from './usePersistentNumber';

type Props = { onOpen: (game: 'hanoi' | 'hoops' | 'daily' | 'towersort') => void };

export function HomeScreen({ onOpen }: Props) {
  const styles = useStyles();
  const [hanoiLevel, , hanoiLoaded] = usePersistentNumber('hanoi.level', 1);
  const [hoopLevel, , hoopLoaded] = usePersistentNumber('hoops.level', 1);
  const [towerLevel, , towerLoaded] = usePersistentNumber('towersort.level', 1);
  const hanoiStars = totalStars(useStars('hanoi'));
  const dailyStars = useStars('daily');
  const today = dailyKey(new Date());
  const streak = dailyStreak(dailyStars, today);
  let dailyStatus = today in dailyStars ? 'Solved today' : 'Play today';
  if (streak > 1) dailyStatus += ` · ${streak}-day streak`;
  const settings = useSettings();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Stack Puzzles
        </Text>
        <Text style={styles.subtitle}>Stacking and sorting puzzles</Text>

        <GameCard
          title="Daily Puzzle"
          description="A new Ring Sort puzzle every day, harder as the week goes on. Match the fewest moves for three stars."
          status={dailyStatus}
          stars={totalStars(dailyStars)}
          chips={[theme.rings[3], theme.rings[6], theme.rings[1]].map((color) => ({ color, width: 44 }))}
          onPress={() => onOpen('daily')}
        />
        <GameCard
          title="Tower Stack"
          description="Move the whole tower to another peg. A disk can never sit on a smaller one."
          status={hanoiLoaded ? `Level ${hanoiLevel}` : null}
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
          description="Sort the colored rings so every rod holds a single color. No scores, just sorting."
          status={hoopLoaded ? `Level ${hoopLevel}` : null}
          chips={[theme.rings[0], theme.rings[5], theme.rings[2]].map((color) => ({ color, width: 44 }))}
          onPress={() => onOpen('hoops')}
        />
        <GameCard
          title="Tower Sort"
          description="Sort the rings by color, but a ring only fits on a bigger one."
          status={towerLoaded ? `Level ${towerLevel}` : null}
          chips={[
            { color: theme.rings[4], width: 58 },
            { color: theme.rings[0], width: 44 },
            { color: theme.rings[2], width: 30 },
          ]}
          onPress={() => onOpen('towersort')}
        />

        <View style={styles.settings}>
          <SettingRow label="Sound" value={settings.sound} onChange={(sound) => updateSettings({ sound })} />
          <SettingRow label="Haptics" value={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingProps = { label: string; value: boolean; onChange: (value: boolean) => void };

function SettingRow({ label, value, onChange }: SettingProps) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.accent, false: colors.border }}
      />
    </View>
  );
}

type Chip = { color: string; width: number };

type CardProps = {
  title: string;
  description: string;
  status: string | null;
  stars?: number;
  chips: Chip[];
  onPress: () => void;
};

function GameCard({ title, description, status, stars = 0, chips, onPress }: CardProps) {
  const styles = useStyles();
  let label = title;
  if (status !== null) label += `, ${status.toLowerCase()}`;
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
          <Text style={styles.cardLevel}>{status === null ? ' ' : `${status} ›`}</Text>
          {stars > 0 && <Text style={styles.cardStars}>{`★ ${stars}`}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
    title: { fontSize: 34, fontWeight: '900', color: colors.ink, marginTop: 24 },
    subtitle: { fontSize: 16, color: colors.muted, marginBottom: 8 },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
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
    cardTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
    cardText: { fontSize: 14, color: colors.muted, lineHeight: 19 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    cardLevel: { fontSize: 15, fontWeight: '700', color: colors.accent },
    cardStars: { fontSize: 15, fontWeight: '700', color: colors.muted },
    settings: {
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 6,
      marginTop: 8,
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    settingLabel: { fontSize: 16, fontWeight: '600', color: colors.ink },
  }),
);
