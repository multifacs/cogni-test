import type {
	CellShape,
	RotationCell,
	RotationDifficulty,
	RotationStructure,
	RotationTask
} from '../types';
import { DIFFICULTY_GRID } from '../types';
import { createRng, int, pick, sample } from './random';
import type { Rng } from './random';

const STRUCTURE_ATTEMPTS = 1000;
const DISTRACTOR_ATTEMPTS = 200;
const OPTION_COUNT = 4;
const MAX_FLIPPED_CELLS = 3;
const SEED_ALPHABET = /[^a-zA-Z0-9]/g;

/** Per-layer arm lengths (a_z, b_z) with a deterministic fallback per grid size. */
type LayerSpec = {
	armX: number;
	armY: number;
	shape: CellShape;
};

const FALLBACK_LAYER_ARMS: Record<number, Array<{ armX: number; armY: number }>> = {
	3: [
		{ armX: 2, armY: 2 },
		{ armX: 2, armY: 2 },
		{ armX: 2, armY: 2 }
	],
	4: [
		{ armX: 3, armY: 3 },
		{ armX: 3, armY: 3 },
		{ armX: 3, armY: 3 },
		{ armX: 3, armY: 3 }
	],
	6: Array.from({ length: 6 }, () => ({ armX: 6, armY: 6 }))
};

const SESSION_PLAN: RotationDifficulty[] = [
	'easy',
	'easy',
	'easy',
	'medium',
	'medium',
	'medium',
	'hard',
	'hard',
	'hard'
];

/**
 * Fill-fraction bounds: 20–50 % of N³, clamped to the feasible maximum
 * (per-layer L-size ≤ 2N−1, layers ≤ N).
 */
export function fillBounds(size: number): { min: number; max: number } {
	const volume = size ** 3;
	const feasibleMax = size * (2 * size - 1);
	return {
		min: Math.ceil(volume * 0.2),
		max: Math.min(Math.floor(volume * 0.5), feasibleMax)
	};
}

function cellKey(cell: { x: number; y: number; z: number }): string {
	return `${cell.x},${cell.y},${cell.z}`;
}

/** Builds the L-shape cells for every layer in canonical order (z, then front arm, then right arm). */
export function buildRotationStructure(size: number, specs: LayerSpec[]): RotationStructure {
	const cells: RotationCell[] = [];
	specs.forEach((spec, z) => {
		for (let x = size - spec.armX; x <= size - 1; x += 1) {
			cells.push({ x, y: 0, z, shape: spec.shape });
		}
		for (let y = 1; y <= spec.armY - 1; y += 1) {
			cells.push({ x: size - 1, y, z, shape: spec.shape });
		}
	});
	return { size, cells, layers: specs.length };
}

/**
 * Fails loudly when any structure invariant is violated:
 * 1. one face-connected component (BFS over 6-neighbors),
 * 2. occupied layers are consecutive starting from z = 0,
 * 3. each layer is a continuous L-shape along the front row and right column,
 * 4. fill fraction within the clamped 20–50 % band,
 * 5. per-layer uniform cell shape.
 */
export function validateRotationStructure(structure: RotationStructure): void {
	const { size, cells, layers } = structure;

	if (!Number.isInteger(size) || size < 1) {
		throw new Error(`Invalid grid size: ${size}`);
	}
	if (!Number.isInteger(layers) || layers < 1 || layers > size) {
		throw new Error(`Layer count ${layers} is outside 1..${size}`);
	}
	if (!cells.length) {
		throw new Error('Structure has no cells');
	}

	const occupied = new Set<string>();
	for (const cell of cells) {
		for (const axis of [cell.x, cell.y, cell.z]) {
			if (!Number.isInteger(axis) || axis < 0 || axis > size - 1) {
				throw new Error(`Cell out of bounds: (${cell.x}, ${cell.y}, ${cell.z})`);
			}
		}
		if (cell.shape !== 'cube' && cell.shape !== 'sphere') {
			throw new Error(`Unknown cell shape: ${String(cell.shape)}`);
		}
		const key = cellKey(cell);
		if (occupied.has(key)) {
			throw new Error(`Duplicate cell: (${cell.x}, ${cell.y}, ${cell.z})`);
		}
		occupied.add(key);
	}

	const byLayer = new Map<number, RotationCell[]>();
	for (const cell of cells) {
		const bucket = byLayer.get(cell.z) ?? [];
		bucket.push(cell);
		byLayer.set(cell.z, bucket);
	}
	const layerKeys = [...byLayer.keys()].sort((a, b) => a - b);
	if (layerKeys.length !== layers) {
		throw new Error(`Occupied layers ${layerKeys.length} differ from declared ${layers}`);
	}
	layerKeys.forEach((z, index) => {
		if (z !== index) {
			throw new Error(`Layers must be consecutive from z = 0 (found gap at ${z})`);
		}
	});

	for (const [z, layerCells] of byLayer) {
		const shapes = new Set(layerCells.map((cell) => cell.shape));
		if (shapes.size !== 1) {
			throw new Error(`Layer ${z} mixes cell shapes`);
		}

		const frontXs = layerCells
			.filter((cell) => cell.y === 0)
			.map((cell) => cell.x)
			.sort((a, b) => a - b);
		if (!frontXs.length) {
			throw new Error(`Layer ${z} has no front arm`);
		}
		const armX = frontXs.length;
		if (frontXs[armX - 1] !== size - 1) {
			throw new Error(`Front arm of layer ${z} must end at the corner x = ${size - 1}`);
		}
		frontXs.forEach((x, index) => {
			if (x !== size - armX + index) {
				throw new Error(`Front arm of layer ${z} is not a contiguous run`);
			}
		});

		const rightYs = layerCells
			.filter((cell) => cell.x === size - 1)
			.map((cell) => cell.y)
			.sort((a, b) => a - b);
		if (!rightYs.length) {
			throw new Error(`Layer ${z} has no right arm`);
		}
		rightYs.forEach((y, index) => {
			if (y !== index) {
				throw new Error(`Right arm of layer ${z} must start at the corner y = 0`);
			}
		});
		const armY = rightYs.length;

		if (!occupied.has(`${size - 1},0,${z}`)) {
			throw new Error(`Corner cell of layer ${z} is missing`);
		}
		for (const cell of layerCells) {
			const inFrontArm = cell.y === 0 && cell.x >= size - armX;
			const inRightArm = cell.x === size - 1 && cell.y < armY;
			if (!inFrontArm && !inRightArm) {
				throw new Error(`Cell (${cell.x}, ${cell.y}, ${z}) lies outside the L-shape arms`);
			}
		}
	}

	const start = cellKey(cells[0]);
	const visited = new Set<string>([start]);
	const queue = [start];
	while (queue.length) {
		const [x, y, z] = queue.pop()!.split(',').map(Number);
		for (const [dx, dy, dz] of [
			[1, 0, 0],
			[-1, 0, 0],
			[0, 1, 0],
			[0, -1, 0],
			[0, 0, 1],
			[0, 0, -1]
		]) {
			const neighbor = `${x + dx},${y + dy},${z + dz}`;
			if (occupied.has(neighbor) && !visited.has(neighbor)) {
				visited.add(neighbor);
				queue.push(neighbor);
			}
		}
	}
	if (visited.size !== cells.length) {
		throw new Error(
			`Structure is not face-connected: ${visited.size}/${cells.length} reachable`
		);
	}

	const bounds = fillBounds(size);
	if (cells.length < bounds.min || cells.length > bounds.max) {
		throw new Error(
			`Fill fraction out of bounds: ${cells.length} cells, expected ${bounds.min}..${bounds.max}`
		);
	}
}

function randomLayerSpecs(rng: Rng, size: number): LayerSpec[] {
	const layers = int(rng, 1, size);
	return Array.from({ length: layers }, () => ({
		armX: int(rng, 1, size),
		armY: int(rng, 1, size),
		shape: pick(rng, ['cube', 'sphere'] as const)
	}));
}

function layerCellCount(spec: { armX: number; armY: number }): number {
	return spec.armX + spec.armY - 1;
}

export function generateStructure(rng: Rng, size: number): RotationStructure {
	if (!Number.isInteger(size) || size < 1) {
		throw new Error(`Invalid grid size: ${size}`);
	}
	const bounds = fillBounds(size);

	for (let attempt = 0; attempt < STRUCTURE_ATTEMPTS; attempt += 1) {
		const specs = randomLayerSpecs(rng, size);
		const total = specs.reduce((sum, spec) => sum + layerCellCount(spec), 0);
		if (total < bounds.min || total > bounds.max) continue;

		const structure = buildRotationStructure(size, specs);
		validateRotationStructure(structure);
		return structure;
	}

	const fallbackArms = FALLBACK_LAYER_ARMS[size];
	if (!fallbackArms) {
		throw new Error(`No structure fallback available for grid size ${size}`);
	}
	const specs = fallbackArms.map((arms) => ({
		...arms,
		shape: pick(rng, ['cube', 'sphere'] as const)
	}));
	const structure = buildRotationStructure(size, specs);
	validateRotationStructure(structure);
	return structure;
}

/** Uniform over [20,70] ∪ [110,160] ∪ [200,250] ∪ [290,340] — ≥ 20° away from every multiple of 90°. */
function sampleYawDeg(rng: Rng): number {
	const band = int(rng, 0, 3);
	return 20 + band * 90 + int(rng, 0, 50);
}

/** Magnitude in [10, 35], random sign. */
function samplePitchDeg(rng: Rng): number {
	const magnitude = int(rng, 10, 35);
	return (rng() < 0.5 ? -1 : 1) * magnitude;
}

function flipShape(shape: CellShape): CellShape {
	return shape === 'cube' ? 'sphere' : 'cube';
}

function optionKey(cells: RotationCell[]): string {
	return cells.map((cell) => `${cell.x},${cell.y},${cell.z}:${cell.shape}`).join('|');
}

function buildOptions(
	rng: Rng,
	structure: RotationStructure
): { options: RotationCell[][]; correctIndex: number } {
	const correct = structure.cells.map((cell) => ({ ...cell }));
	const seen = new Set<string>([optionKey(correct)]);
	const distractors: RotationCell[][] = [];
	const cellIndices = structure.cells.map((_, index) => index);

	let attempts = 0;
	while (distractors.length < OPTION_COUNT - 1 && attempts < DISTRACTOR_ATTEMPTS) {
		attempts += 1;
		const flipCount = int(rng, 1, Math.min(MAX_FLIPPED_CELLS, correct.length));
		const flips = new Set(sample(rng, cellIndices, flipCount));
		const candidate = correct.map((cell, index) =>
			flips.has(index) ? { ...cell, shape: flipShape(cell.shape) } : { ...cell }
		);
		const key = optionKey(candidate);
		if (seen.has(key)) continue;
		seen.add(key);
		distractors.push(candidate);
	}
	if (distractors.length < OPTION_COUNT - 1) {
		throw new Error('Failed to generate pairwise-distinct distractors');
	}

	const correctIndex = int(rng, 0, OPTION_COUNT - 1);
	const options = [...distractors];
	options.splice(correctIndex, 0, correct);
	return { options, correctIndex };
}

export function generateRotationTask(
	difficulty: RotationDifficulty,
	seed: string,
	taskIndex: number
): RotationTask {
	if (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard') {
		throw new Error(`Unknown difficulty: ${String(difficulty)}`);
	}
	if (typeof seed !== 'string' || !seed.length) {
		throw new Error('Seed must be a non-empty string');
	}
	if (!Number.isInteger(taskIndex) || taskIndex < 1) {
		throw new Error(`taskIndex must be a positive integer, got ${String(taskIndex)}`);
	}

	const rng = createRng(seed);
	const size = DIFFICULTY_GRID[difficulty];
	const structure = generateStructure(rng, size);
	const options = buildOptions(rng, structure);

	return {
		id: `rotation-${taskIndex}-${seed.replace(SEED_ALPHABET, '').slice(-10)}`,
		seed,
		taskIndex,
		difficulty,
		gridSize: size,
		structure,
		rotation: {
			yawDeg: sampleYawDeg(rng),
			pitchDeg: samplePitchDeg(rng)
		},
		options: options.options,
		correctIndex: options.correctIndex
	};
}

export function generateRotationSession(seed?: string): RotationTask[] {
	const baseSeed =
		seed ?? `rotation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	return SESSION_PLAN.map((difficulty, index) =>
		generateRotationTask(difficulty, `${baseSeed}-task-${index + 1}`, index + 1)
	);
}
