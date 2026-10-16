import { useState } from 'react';
import { Share } from 'react-native';
import { DailyHistory } from '../../components/DailyHistory';
import { LoadingScreen } from '../../components/LoadingScreen';
import { WithOverlay } from '../../components/WithOverlay';
import { dailyLabel, dailyStreak, shareText } from '../../daily';
import { starsFor, useStars } from '../../stars';
import { useToday } from '../../useToday';
import { useDailyDeal } from './deals';
import { RingSortGame } from './HoopScreen';
import { dailySpec } from './logic';

export function DailyScreen({ onBack }: { onBack: () => void }) {
  const key = useToday();
  const [showingHistory, setShowingHistory] = useState(false);
  const deal = useDailyDeal(key);
  const streak = dailyStreak(useStars('daily'), key);
  if (!deal) return <LoadingScreen title="Daily Puzzle" onBack={onBack} />;
  const optimal = deal.solution.length;
  const history = showingHistory && <DailyHistory today={key} onBack={() => setShowingHistory(false)} />;
  return (
    <WithOverlay overlay={history}>
      <RingSortGame
        deal={deal}
        capacity={dailySpec(key).capacity}
        title="Daily Puzzle"
        label={dailyLabel(key)}
        scoring={{ game: 'daily', key, optimal }}
        winNote={streak > 1 ? `${streak}-day streak` : null}
        onShare={(moves) => {
          Share.share({ message: shareText({ key, moves, optimal, stars: starsFor(moves, optimal), streak }) }).catch(() => {});
        }}
        onBack={onBack}
        onLevels={() => setShowingHistory(true)}
        levelsLabel="History"
        nextLabel="Done"
        onNext={onBack}
      />
    </WithOverlay>
  );
}
