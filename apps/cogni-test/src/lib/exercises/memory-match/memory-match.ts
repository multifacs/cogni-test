// Перетасовка с seed (xorshift32)
export function seededShuffle<T>(arr: T[], seed = Date.now()): { out: T[]; seed: number } {
  let s = seed >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    const j = (s >>> 0) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return { out: a, seed };
}

// Генерация пар из массива URL'ов
export function buildPairsFromUrls(urls: string[], pairs: number): { key: string; imgUrl: string }[] {
  const chosen = urls.slice(0, pairs);
  return chosen.flatMap((imgUrl, idx) => {
    const key = `img-${idx}`;
    return [{ key, imgUrl }, { key, imgUrl }];
  });
}

export function nowMs() { return Date.now(); }
