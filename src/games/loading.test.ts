import { loadOnce } from './loading';

describe('loadOnce', () => {
  it('shares a load between callers until it settles', async () => {
    const load = jest.fn(() => Promise.resolve(7));
    const first = loadOnce('deal', load);
    expect(loadOnce('deal', load)).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
    await expect(first).resolves.toBe(7);
    await loadOnce('deal', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps loads with different ids apart', async () => {
    const load = jest.fn(() => Promise.resolve(1));
    await Promise.all([loadOnce('a', load), loadOnce('b', load)]);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
