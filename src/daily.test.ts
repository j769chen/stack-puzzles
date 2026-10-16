import { dailyLabel, dailyStreak, shareText } from './daily';

describe('dailyStreak', () => {
  it('counts consecutive solved days ending today', () => {
    expect(dailyStreak({ 20261014: 1, 20261015: 3, 20261016: 2 }, 20261016)).toBe(3);
  });

  it("keeps yesterday's streak alive until today is played", () => {
    expect(dailyStreak({ 20261014: 1, 20261015: 3 }, 20261016)).toBe(2);
  });

  it('breaks on a missed day and runs across month ends', () => {
    expect(dailyStreak({ 20261028: 3, 20261030: 3, 20261031: 1, 20261101: 2 }, 20261101)).toBe(3);
    expect(dailyStreak({ 20261014: 3 }, 20261016)).toBe(0);
    expect(dailyStreak({}, 20261016)).toBe(0);
  });
});

describe('shareText', () => {
  it('shares the date, stars, moves and streak', () => {
    expect(shareText({ key: 20261016, moves: 38, optimal: 36, stars: 2, streak: 4 })).toBe(
      `Stack Puzzles Daily · ${dailyLabel(20261016)}\n★★☆ 38/36 moves\n4-day streak`,
    );
  });

  it('leaves out a streak of one day', () => {
    expect(shareText({ key: 20261016, moves: 36, optimal: 36, stars: 3, streak: 1 })).toBe(
      `Stack Puzzles Daily · ${dailyLabel(20261016)}\n★★★ 36/36 moves`,
    );
  });
});
