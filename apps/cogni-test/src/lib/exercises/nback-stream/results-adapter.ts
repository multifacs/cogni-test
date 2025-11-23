import type { FullResult } from "./types";

export function toDbAttempts(r: FullResult) {
  return r.clicks.map((c, i) => ({
    attempt: i + 1,
    time: c.rtMs,
    stage: r.nBack,
    cards: 0,
    flips: 0,
    mistakes: c.isCorrect ? 0 : 1,
    efficiency: c.rtMs,
    isCorrect: c.isCorrect,
    domain: r.domain,
    target: r.target,
    interClickMs: c.interClickMs,
    stimIndex: c.stimIndex
  }));
}

export function summary(r: FullResult) {
  const correct = r.clicks.filter(c => c.isCorrect).length;
  const incorrect = r.clicks.length - correct;
  const avgRt = r.clicks.length ? Math.round(r.clicks.reduce((a,c)=>a+c.rtMs,0)/r.clicks.length) : null;
  return { correct, incorrect, accuracy: r.clicks.length ? +(correct/r.clicks.length).toFixed(3) : 0, avgRtMs: avgRt };
}
