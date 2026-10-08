/** Сложность задачи «Оригами». */
export type OrigamiDifficulty = 'simple' | 'medium' | 'hard';

/**
 * Сериализуемое описание сгиба (уходит в БД как JSON).
 * Материализуется в Line исключительно внутри engine.ts (parse-don't-validate).
 */
export type FoldSpec =
	| { kind: 'h'; at: number }
	| { kind: 'v'; at: number }
	| { kind: 'diag'; corner: 'tl' | 'tr' }
	| { kind: 'free'; angle: number; offset: number };

/** Точка в плоскости (SVG-соглашение: ось y вниз). */
export type Pt = { x: number; y: number };

/**
 * Нормализованная прямая ax + by + c = 0, a² + b² = 1.
 * Знак выражения в точке задаёт сторону полуплоскости.
 */
export type Line = { a: number; b: number; c: number };

/** Аффинная матрица (SVG-соглашение): apply(m, p) = (a·px + c·py + e, b·px + d·py + f). */
export type Mat = { a: number; b: number; c: number; d: number; e: number; f: number };

/** Кусок бумаги: полигон в координатах стола + матрица в координаты листа. */
export type Piece = { poly: Pt[]; toSheet: Mat };

/**
 * Кадр-стимул: исходный лист, состояние после каждого сгиба (crease — линия
 * сгиба, movedPolys — полигоны свежеперегнутых частей для подсветки),
 * события прокола (новая точка).
 */
export type OrigamiStep = {
	kind: 'sheet' | 'fold' | 'puncture';
	pieces: Piece[];
	crease?: Line;
	movedPolys?: Pt[][];
	dots: Pt[];
};

/** Вариант ответа: дырки на развёрнутом листе (координаты листа). */
export type OrigamiOption = { holes: Pt[] };

/** Полная задача, готовая для UI. */
export type OrigamiTask = {
	seed: string;
	taskIndex: number;
	difficulty: OrigamiDifficulty;
	folds: FoldSpec[];
	steps: OrigamiStep[];
	options: OrigamiOption[];
	correctIndex: number;
};

/** Строка БД для последующих задач (folds = JSON.stringify(FoldSpec[])). */
export type OrigamiAttemptRow = {
	taskIndex: number;
	difficulty: OrigamiDifficulty;
	folds: string;
	selectedIndex: number;
	correctIndex: number;
	isCorrect: boolean;
	responseTimeMs: number;
	seed: string;
};
