export type Domain = 'figures' | 'numbers';
export type TargetFeature = 'shape' | 'color' | 'number';

export type FigureStim = { shape: string; color: string };
export type NumberStim = { value: number };

export type Stimulus =
  | { idx: number; domain: 'figures'; payload: FigureStim; truth: boolean | null }
  | { idx: number; domain: 'numbers'; payload: NumberStim; truth: boolean | null };

export type ClickEvent = {
  ts: number;
  stimIndex: number;
  domain: Domain;
  nBack: 1 | 2 | 3;
  target: TargetFeature;
  answer: 'yes' | 'no';
  truth: boolean;
  isCorrect: boolean;
  rtMs: number;
  interClickMs: number;
};

export type FullResult = {
  domain: Domain;
  nBack: 1 | 2 | 3;
  target: TargetFeature;
  durationMs: number;
  clicks: ClickEvent[];
  totalStimuli: number;
  summary: {
    correct: number;
    incorrect: number;
    accuracy: number;
    avgRtMs: number | null;
    misses: number;
  };
};
