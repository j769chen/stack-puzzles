import { firstFound, runInSlices, runTask } from './task';

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
    await expect(runInSlices(steps(log), { sliceMs: 0 })).resolves.toBe('done');
    expect(log).toEqual(['first', 'timer', 'second']);
  });

  it('keeps going without pausing while the slice lasts', async () => {
    const log: string[] = [];
    setTimeout(() => log.push('timer'), 0);
    await expect(runInSlices(steps(log), { sliceMs: 60_000 })).resolves.toBe('done');
    expect(log).toEqual(['first', 'second']);
  });

  it('stops at the next slice once cancelled', async () => {
    const log: string[] = [];
    const controller = new AbortController();
    const run = runInSlices(steps(log), { sliceMs: 0, signal: controller.signal });
    controller.abort();
    await expect(run).rejects.toThrow('Cancelled');
    expect(log).toEqual(['first']);
  });

  it('returns the first attempt that finds something', () => {
    const results = [null, null, 'third', 'fourth'];
    let tries = 0;
    const found = runTask(
      firstFound(function* () {
        yield;
        return results[tries++];
      }, 10),
    );
    expect(found).toBe('third');
    expect(tries).toBe(3);
  });

  it('gives up after the allowed number of attempts', () => {
    let tries = 0;
    const search = firstFound(function* () {
      tries++;
      return null;
    }, 5);
    expect(() => runTask(search)).toThrow('Nothing found in 5 tries');
    expect(tries).toBe(5);
  });
});
