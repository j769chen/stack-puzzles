import { runInSlices, runTask } from './task';

function* steps(log: string[]) {
  log.push('first');
  yield;
  log.push('second');
  yield;
  return 'done';
}

describe('tasks', () => {
  it('runs a task to the end at once', () => {
    const log: string[] = [];
    expect(runTask(steps(log))).toBe('done');
    expect(log).toEqual(['first', 'second']);
  });

  it('lets other work run between slices', async () => {
    const log: string[] = [];
    setTimeout(() => log.push('timer'), 0);
    await expect(runInSlices(steps(log), 0)).resolves.toBe('done');
    expect(log).toEqual(['first', 'timer', 'second']);
  });

  it('keeps going without pausing while the slice lasts', async () => {
    const log: string[] = [];
    setTimeout(() => log.push('timer'), 0);
    await expect(runInSlices(steps(log), 60_000)).resolves.toBe('done');
    expect(log).toEqual(['first', 'second']);
  });
});
