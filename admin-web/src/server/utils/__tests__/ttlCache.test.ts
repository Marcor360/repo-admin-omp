import { expect, it, vi } from 'vitest';
import { TtlCache } from '../ttlCache';

it('shares concurrent reads and refreshes after invalidation', async () => {
  const cache = new TtlCache<number>(30_000);
  const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
  const results = await Promise.all([cache.getOrLoad('stats', load), cache.getOrLoad('stats', load)]);
  expect(results).toEqual([1, 1]);
  expect(load).toHaveBeenCalledTimes(1);
  cache.clear();
  expect(await cache.getOrLoad('stats', load)).toBe(2);
});

it('does not repopulate the cache from a read that started before a mutation', async () => {
  const cache = new TtlCache<number>(30_000);
  let finish: (value: number) => void = () => undefined;
  const old = cache.getOrLoad('stats', () => new Promise((resolve) => { finish = resolve; }));
  await Promise.resolve();
  cache.clear();
  const current = cache.getOrLoad('stats', async () => 2);
  finish(1);
  await old;
  await current;
  expect(cache.get('stats')).toBe(2);
});
