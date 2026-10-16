import { dailyDate, previousDay } from './games/hoops/logic';
import { type LevelStars, MAX_STARS } from './stars';

export function dailyStreak(solved: LevelStars, today: number): number {
  let day = today in solved ? today : previousDay(today);
  let streak = 0;
  for (; day in solved; day = previousDay(day)) streak++;
  return streak;
}

export function dailyLabel(key: number): string {
  return dailyDate(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

type Result = { key: number; moves: number; optimal: number; stars: number; streak: number };

export function shareText({ key, moves, optimal, stars, streak }: Result): string {
  const lines = [
    `Stack Puzzles Daily · ${dailyLabel(key)}`,
    `${'★'.repeat(stars)}${'☆'.repeat(MAX_STARS - stars)} ${moves}/${optimal} moves`,
  ];
  if (streak > 1) lines.push(`${streak}-day streak`);
  return lines.join('\n');
}
