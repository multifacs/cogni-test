export type DotPositionResult = {
	attempt: number; // 1..9, сквозной индекс раунда
	stage: 1 | 2 | 3;
	reactionMs: number; // от скрытия точки до тапа; нетап = TIME_RESPOND_MS
	correct: boolean; // попадание в окно HIT_WINDOW
	distance: number | null; // евклидово расстояние тап→точка; null = тапа не было (нетап-раунд), расстояние не определено
};
