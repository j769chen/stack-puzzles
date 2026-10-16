import { useState } from 'react';
import { Share } from 'react-native';
import { dailyLabel, dailyStreak, shareText } from '../../daily';
import { starsFor, useStars } from '../../stars';
import { useDailyDeal } from './deals';
import { RingSortGame } from './HoopScreen';
import { dailyKey, dailySpec } from './logic';

export function DailyScreen({ onBack }: { onBack: () => void }) {
  const [key] = useState(() => dailyKey(new Date()));
  const deal = useDailyDeal(key);
  const streak = dailyStreak(useStars('daily'), key);
  if (!deal) return null;
  const optimal = deal.solution.length;
  return (
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
      nextLabel="Done"
      onNext={onBack}
    />
  );
}
