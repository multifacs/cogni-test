export type Rng = () => number;

export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createRng(seed: string): Rng {
  let a = hashSeed(seed);
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function int(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (!items.length) throw new Error('Cannot pick from an empty array');
  return items[int(rng, 0, items.length - 1)];
}

export function sample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  const limit = Math.min(count, pool.length);
  for (let i = 0; i < limit; i += 1) {
    const idx = int(rng, 0, pool.length - 1);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = int(rng, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}
