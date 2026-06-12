export type StageSpec = {
  stage: 1 | 2 | 3;
  rows: number;
  cols: number;
  pairs: number;
};

export type CardModel = {
  id: string;
  key: string;     // одинаков для пары
  imgUrl: string;
  isOpen: boolean;
  isMatched: boolean;
};

export type PairMetric = {
  key: string;
  infoKnownAtTurn: number;   // на каком ходу пара стала «известна» (обе позиции уже когда-либо видели)
  matchedAtTurn: number;     // на каком ходу реально собралась пара
  pairEfficiency: number;    // matchedAtTurn - infoKnownAtTurn
  excludedAsInstant: boolean;// исключена из среднего (если угадали сразу)
};

export type StageResult = {
  stage: number;
  rows: number;
  cols: number;
  cardsCount: number;    // rows*cols
  pairsCount: number;    // cardsCount/2
  flipsCount: number;    // каждое открытие (первая и вторая карта считаются)
  mistakes: number;      // несовпавшие попытки (ходы)
  startedAt: number;     // epoch ms
  endedAt: number;       // epoch ms
  durationMs: number;
  efficiency: number;    // flipsCount / cardsCount
  turnCount: number;     // число завершённых «ходов» (каждый раз, когда открыли вторую карту)
  pairMetrics: PairMetric[];
  avgPairEfficiency: number | null; // среднее по не-мгновенным парам или null, если все мгновенные
};

export type FullResult = {
  perStage: StageResult[];
  totalDurationMs: number;    // непрерывный суммарный таймер
};
