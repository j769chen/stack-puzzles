import { dailyDate, dailyKey, previousDay } from './games/hoops/logic';
import { type LevelStars, MAX_STARS } from './stars';

export function dailyStreak(solved: LevelStars, today: number): number {
  let day = today in solved ? today : previousDay(today);
  let streak = 0;
  for (; day in solved; day = previousDay(day)) streak++;
  return streak;
}

function nextDay(key: number): number {
  const date = dailyDate(key);
  date.setDate(date.getDate() + 1);
  return dailyKey(date);
}

export function bestStreak(solved: LevelStars): number {
  let best = 0;
  for (const start of Object.keys(solved).map(Number)) {
    if (previousDay(start) in solved) continue;
    let run = 0;
    for (let day = start; day in solved; day = nextDay(day)) run++;
    best = Math.max(best, run);
  }
  return best;
}

export function monthCells(year: number, month: number): (number | null)[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => dailyKey(new Date(year, month, i + 1))),
  ];
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
