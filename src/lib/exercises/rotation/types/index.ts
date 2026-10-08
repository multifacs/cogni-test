export type CellShape = 'cube' | 'sphere';

export type RotationCell = {
	x: number;
	y: number;
	z: number;
	shape: CellShape;
};

export type RotationStructure = {
	size: number;
	cells: RotationCell[];
	layers: number;
};

export type RotationDifficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_GRID: Record<RotationDifficulty, 3 | 4 | 6> = {
	easy: 3,
	medium: 4,
	hard: 6
};

export const DIFFICULTY_LEVEL: Record<RotationDifficulty, 1 | 2 | 3> = {
	easy: 1,
	medium: 2,
	hard: 3
};

/**
 * One orthographic view of the structure: `view[z][axis]` holds the shape of
 * the nearest occupied cell along the viewing axis, or `null` when the
 * (layer, axis) column is empty.
 *
 * - front view (viewer at −y): axis index is `x`
 * - right view (viewer at +x): axis index is `y`
 */
export type RotationProjection = Array<Array<CellShape | null>>;

export type RotationTask = {
	id: string;
	seed: string;
	taskIndex: number;
	difficulty: RotationDifficulty;
	gridSize: number;
	structure: RotationStructure;
	rotation: {
		yawDeg: number;
		pitchDeg: number;
	};
	/** Exactly 4 options over the SAME structure; they differ only in cell shapes. */
	options: RotationCell[][];
	correctIndex: number;
};

export type RotationAnswerRow = {
	taskIndex: number;
	difficultyLevel: 1 | 2 | 3;
	gridSize: number;
	selectedIndex: number | null;
	correctIndex: number;
	isCorrect: boolean;
	responseTimeMs: number;
	timedOut: boolean;
	seed: string;
};
