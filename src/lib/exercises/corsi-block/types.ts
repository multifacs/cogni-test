export type CorsiBlockResult = {
	attempt: number; // 1..9, сквозной номер захода
	sequenceLength: number; // 3..11, количество подсветов в этой итерации
	isCorrect: boolean; // вся последовательность воспроизведена верно в порядке за 15 с
	answerMs: number; // время фазы ответа; таймаут = ANSWER_TIMEOUT_MS (15000)
};
