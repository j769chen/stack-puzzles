import { useState } from 'react';
import { useDailyDeal } from './deals';
import { RingSortGame } from './HoopScreen';
import { dailyDate, dailyKey, dailySpec } from './logic';

export function DailyScreen({ onBack }: { onBack: () => void }) {
  const [key] = useState(() => dailyKey(new Date()));
  const deal = useDailyDeal(key);
  if (!deal) return null;
  const label = dailyDate(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <RingSortGame
      deal={deal}
      capacity={dailySpec(key).capacity}
      title="Daily Puzzle"
      label={label}
      scoring={{ game: 'daily', key, optimal: deal.solution.length }}
      onBack={onBack}
      nextLabel="Done"
      onNext={onBack}
    />
  );
}
