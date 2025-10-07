// Адаптер под НОВЫЙ FullResult из MemoryMatchGame.svelte

import type { FullResult } from "./types";

// Серия для линии «открытия/карта» (эффективность) — одна точка на этап
export function toOpensPerCardSeries(r: FullResult) {
  return r.perStage.map(s => ({
    x: s.stage,
    y: +(s.flipsCount / s.cardsCount).toFixed(3),
    label: `stage ${s.stage}`
  }));
}

// Короткая сводка для заголовка
export function summary(r: FullResult) {
  const totalDurationMs = r.perStage.reduce((a, s) => a + s.durationMs, 0);
  const totalFlips = r.perStage.reduce((a, s) => a + s.flipsCount, 0);
  const totalMistakes = r.perStage.reduce((a, s) => a + s.mistakes, 0);
  const meanEfficiency =
    r.perStage.length
      ? r.perStage.reduce((a, s) => a + s.flipsCount / s.cardsCount, 0) / r.perStage.length
      : 0;

  return { totalDurationMs, totalFlips, totalMistakes, meanEfficiency };
}

// Что пишем в БД (совместимо с memory_match_attempt)
export function toDbAttempts(r: FullResult) {
  return r.perStage.map(s => ({
    attempt: s.stage,           // 1..3
    time: s.durationMs,         // ms
    stage: s.stage,
    cards: s.cardsCount,
    flips: s.flipsCount,
    mistakes: s.mistakes,
    efficiency: +(s.flipsCount / s.cardsCount).toFixed(3),
    isCorrect: true
  }));
}
