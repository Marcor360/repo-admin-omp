interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Cache en memoria del propio proceso — suficiente para un solo usuario admin, no sobrevive un redeploy. */
export class TtlCache<T> {
  private readonly inFlight = new Map<string, Promise<T>>();
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  getOrLoad(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return Promise.resolve(cached);
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const request = Promise.resolve().then(load).then((value) => {
      if (this.inFlight.get(key) === request) this.set(key, value);
      return value;
    }).finally(() => {
      if (this.inFlight.get(key) === request) this.inFlight.delete(key);
    });
    this.inFlight.set(key, request);
    return request;
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }
}
