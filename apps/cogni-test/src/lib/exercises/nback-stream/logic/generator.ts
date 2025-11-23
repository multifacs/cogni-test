import type { Domain, TargetFeature, Stimulus, FigureStim } from "../types";

const SHAPES = ['circle','square','triangle','diamond','star','hex'];
const COLORS = ['#EF4444','#10B981','#3B82F6','#F59E0B','#8B5CF6','#14B8A6'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random()*arr.length)];
}

function randFigure(): FigureStim {
  return { shape: pick(SHAPES), color: pick(COLORS) };
}

function newFigureWithConstraint(prev: FigureStim, target: 'shape'|'color', match: boolean): FigureStim {
  let shape = prev.shape;
  let color = prev.color;
  if (target === 'shape') {
    if (!match) {
      const others = SHAPES.filter(s => s !== prev.shape);
      shape = pick(others);
    } else {
      shape = prev.shape;
    }
    const colors = COLORS.filter(c => Math.random()<0.8 ? c !== prev.color : true);
    color = pick(colors);
  } else {
    if (!match) {
      const others = COLORS.filter(c => c !== prev.color);
      color = pick(others);
    } else {
      color = prev.color;
    }
    const shapes = SHAPES.filter(s => Math.random()<0.8 ? s !== prev.shape : true);
    shape = pick(shapes);
  }
  return { shape, color };
}

// Генерация фиксированного количества стимулов (по клику, не по таймеру)
// truth = совпадение целевого признака с n шагов назад
export function generateSequence(opts: {
  domain: Domain;
  nBack: 1|2|3;
  target: TargetFeature;
  totalCount: number;
  matchRatio?: number;
}): Stimulus[] {
  const { domain, nBack, target, totalCount } = opts;
  const matchRatio = Math.min(0.8, Math.max(0.1, opts.matchRatio ?? 0.3));
  const total = Math.max(nBack+3, totalCount);

  const seq: Stimulus[] = [];
  if (domain === 'figures') {
    for (let i=0;i<nBack;i++) {
      seq.push({ idx: i, domain: 'figures', payload: randFigure(), truth: null });
    }
    for (let i=nBack;i<total;i++) {
      const wantMatch = Math.random() < matchRatio;
      const ref = (seq[i-nBack] as any).payload as FigureStim;
      const payload = newFigureWithConstraint(ref, target === 'shape' ? 'shape' : 'color', wantMatch);
      seq.push({ idx: i, domain: 'figures', payload, truth: wantMatch });
    }
  } else {
    const range = [1,2,3,4,5,6,7,8,9];
    for (let i=0;i+nBack<total;i++) {}
    for (let i=0;i<nBack;i++) {
      const v = pick(range);
      seq.push({ idx: i, domain: 'numbers', payload: { value: v }, truth: null });
    }
    for (let i=nBack;i<total;i++) {
      const wantMatch = Math.random() < matchRatio;
      const refVal = (seq[i-nBack] as any).payload.value as number;
      let v = refVal;
      if (!wantMatch) {
        const cand = range.filter(x => x !== refVal);
        v = pick(cand);
      }
      seq.push({ idx: i, domain: 'numbers', payload: { value: v }, truth: wantMatch });
    }
  }
  // ограничим серии совпадений до 2
  let streak = 0;
  for (let i=0;i<seq.length;i++) {
    const t = seq[i].truth;
    if (t === true) {
      streak++;
      if (streak > 2) {
        if (seq[i].domain === 'figures') {
          const ref = (seq[i-nBack] as any).payload as FigureStim;
          if (target === 'shape') {
            const shapes = SHAPES.filter(s => s !== ref.shape);
            (seq[i] as any).payload.shape = pick(shapes);
          } else if (target === 'color') {
            const colors = COLORS.filter(c => c !== ref.color);
            (seq[i] as any).payload.color = pick(colors);
          }
        } else {
          const refVal = (seq[i-nBack] as any).payload.value as number;
          const range = [1,2,3,4,5,6,7,8,9];
          const cand = range.filter(x => x !== refVal);
          (seq[i] as any).payload.value = pick(cand);
        }
        (seq[i] as any).truth = false;
        streak = 0;
      }
    } else {
      streak = 0;
    }
  }
  return seq;
}
