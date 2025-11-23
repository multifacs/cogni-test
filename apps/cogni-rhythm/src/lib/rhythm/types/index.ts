export type RhythmResult = {
	attempt: number;  // таймстемп нажатия (ms, performance.now / rAF)
	note: number;     // таймстемп эталонной ноты (ms)
	overpress?: number; // опционально: пережатия (actualCount - expectedCount) для всего теста
};
