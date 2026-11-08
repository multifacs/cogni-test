import type { CellShape, RotationProjection, RotationStructure } from '../types';
import { buildRotationStructure, validateRotationStructure } from './generator';

export type Point3 = { x: number; y: number; z: number };

export type ProjectedPoint = {
	/** Screen x, grows rightward. */
	sx: number;
	/** Screen y, grows DOWNWARD. */
	sy: number;
	/** Camera-space nearness: larger = nearer to the camera. */
	depth: number;
};

const DEG2RAD = Math.PI / 180;

function assertFinite(...values: number[]): void {
	for (const value of values) {
		if (!Number.isFinite(value)) {
			throw new Error(`projectPoint expects finite coordinates, got ${String(value)}`);
		}
	}
}

/**
 * Projects a grid point after centering the structure on the origin
 * (subtract the grid center; pass `gridSize` so renders come out centered).
 *
 * Yaw rotates around the vertical z-axis; pitch tilts around the screen-x axis.
 * - yaw 0, pitch 0 → front view (viewer at −y looking +y): sx ~ +x, sy ~ −z, depth ~ −y.
 * - yaw −90, pitch 0 → right view (viewer at +x looking −x): sx ~ +y, depth ~ +x.
 */
export function projectPoint(
	p: Point3,
	yawDeg: number,
	pitchDeg: number,
	gridSize?: number
): ProjectedPoint {
	assertFinite(p.x, p.y, p.z, yawDeg, pitchDeg);
	if (gridSize !== undefined && (!Number.isInteger(gridSize) || gridSize < 1)) {
		throw new Error(`gridSize must be a positive integer, got ${String(gridSize)}`);
	}

	const center = gridSize === undefined ? 0 : (gridSize - 1) / 2;
	const x = p.x - center;
	const y = p.y - center;
	const z = p.z - center;

	const yaw = yawDeg * DEG2RAD;
	const pitch = pitchDeg * DEG2RAD;
	const cosYaw = Math.cos(yaw);
	const sinYaw = Math.sin(yaw);

	// Yaw around the vertical z-axis.
	const xYaw = x * cosYaw - y * sinYaw;
	const yYaw = x * sinYaw + y * cosYaw;

	// Pitch around the screen-x axis: mixes the depth direction with the up direction.
	const cosPitch = Math.cos(pitch);
	const sinPitch = Math.sin(pitch);
	const yTilt = yYaw * cosPitch + z * sinPitch;
	const zTilt = z * cosPitch - yYaw * sinPitch;

	return { sx: xYaw, sy: -zTilt, depth: -yTilt };
}

export type OrthographicViews = {
	/** front view (viewer at −y): front[z][x] = shape of the nearest cell along y. */
	front: RotationProjection;
	/** right view (viewer at +x): right[z][y] = shape of the nearest cell along x. */
	right: RotationProjection;
};

/**
 * Computes the two orthographic projections the exercise shows to the player.
 * The L-shape guarantees every occupied (z, x) column has its frontmost cell at
 * y = 0 and every occupied (z, y) column has its rightmost cell at x = N−1,
 * so a_z and b_z (and the per-layer shapes) are fully recoverable.
 */
export function orthographicProjections(structure: RotationStructure): OrthographicViews {
	const { size, cells, layers } = structure;
	if (!Number.isInteger(size) || size < 1) {
		throw new Error(`Invalid grid size: ${size}`);
	}
	if (!Number.isInteger(layers) || layers < 1 || layers > size) {
		throw new Error(`Layer count ${String(layers)} is outside 1..${size}`);
	}

	const front: RotationProjection = Array.from({ length: layers }, () =>
		Array.from<CellShape | null>({ length: size }).fill(null)
	);
	const right: RotationProjection = Array.from({ length: layers }, () =>
		Array.from<CellShape | null>({ length: size }).fill(null)
	);
	const frontNearestY: number[][] = Array.from({ length: layers }, () =>
		Array.from({ length: size }, () => Number.POSITIVE_INFINITY)
	);
	const rightNearestX: number[][] = Array.from({ length: layers }, () =>
		Array.from({ length: size }, () => Number.NEGATIVE_INFINITY)
	);

	for (const cell of cells) {
		const { x, y, z, shape } = cell;
		if (
			!Number.isInteger(x) ||
			!Number.isInteger(y) ||
			!Number.isInteger(z) ||
			x < 0 ||
			y < 0 ||
			z < 0 ||
			x > size - 1 ||
			y > size - 1 ||
			z > layers - 1
		) {
			throw new Error(`Cell out of bounds: (${x}, ${y}, ${z})`);
		}
		if (y < frontNearestY[z][x]) {
			frontNearestY[z][x] = y;
			front[z][x] = shape;
		}
		if (x > rightNearestX[z][y]) {
			rightNearestX[z][y] = x;
			right[z][y] = shape;
		}
	}

	return { front, right };
}

type ParsedRun = {
	runLength: number;
	shape: CellShape;
};

/** Parses a front-view row: a contiguous non-null suffix ending at the last column. */
function parseSuffixRun(row: Array<CellShape | null>, size: number, label: string): ParsedRun {
	let firstNonNull = -1;
	for (let i = 0; i < size; i += 1) {
		if (row[i] !== null) {
			firstNonNull = i;
			break;
		}
	}
	if (firstNonNull === -1) {
		throw new Error(`${label}: projection row is empty`);
	}

	let shape: CellShape | null = null;
	for (let i = firstNonNull; i < size; i += 1) {
		const value = row[i];
		if (value === null) {
			throw new Error(`${label}: gap inside the occupied run`);
		}
		if (shape === null) {
			shape = value;
		} else if (shape !== value) {
			throw new Error(`${label}: mixed cell shapes within one layer`);
		}
	}
	if (shape === null) {
		throw new Error(`${label}: no occupied cells`);
	}
	return { runLength: size - firstNonNull, shape };
}

/** Parses a right-view row: a contiguous non-null prefix starting at column 0. */
function parsePrefixRun(row: Array<CellShape | null>, size: number, label: string): ParsedRun {
	let runLength = 0;
	while (runLength < size && row[runLength] !== null) {
		runLength += 1;
	}
	if (runLength === 0) {
		throw new Error(`${label}: projection row is empty`);
	}

	let shape: CellShape | null = null;
	for (let i = 0; i < runLength; i += 1) {
		const value = row[i];
		if (value === null) {
			throw new Error(`${label}: gap inside the occupied run`);
		}
		if (shape === null) {
			shape = value;
		} else if (shape !== value) {
			throw new Error(`${label}: mixed cell shapes within one layer`);
		}
	}
	for (let i = runLength; i < size; i += 1) {
		if (row[i] !== null) {
			throw new Error(`${label}: occupied cell after the run ended`);
		}
	}
	if (shape === null) {
		throw new Error(`${label}: no occupied cells`);
	}
	return { runLength, shape };
}

/**
 * Rebuilds the unique structure matching the two orthographic projections:
 * a_z (front run) and b_z (right run) fully determine each layer's L-shape,
 * so the whole structure — occupancy and shapes — is uniquely reconstructible.
 * Fails loudly on malformed projections (ragged rows, gaps, mixed shapes).
 */
export function reconstructFromProjections(
	front: RotationProjection,
	right: RotationProjection,
	size: number
): RotationStructure {
	if (!Number.isInteger(size) || size < 1) {
		throw new Error(`Invalid grid size: ${String(size)}`);
	}
	if (front.length !== right.length) {
		throw new Error(
			`Front/right projection layer counts differ: ${front.length} vs ${right.length}`
		);
	}
	if (front.length < 1 || front.length > size) {
		throw new Error(`Projection layer count ${front.length} is outside 1..${size}`);
	}
	for (let z = 0; z < front.length; z += 1) {
		if (front[z].length !== size || right[z].length !== size) {
			throw new Error(`Ragged projection row at layer ${z}: expected width ${size}`);
		}
	}

	const specs: Array<{ armX: number; armY: number; shape: CellShape }> = [];
	for (let z = 0; z < front.length; z += 1) {
		const frontRun = parseSuffixRun(front[z], size, `front layer ${z}`);
		const rightRun = parsePrefixRun(right[z], size, `right layer ${z}`);
		if (frontRun.shape !== rightRun.shape) {
			throw new Error(`Shape mismatch between views at layer ${z}`);
		}
		specs.push({ armX: frontRun.runLength, armY: rightRun.runLength, shape: frontRun.shape });
	}

	const structure = buildRotationStructure(size, specs);
	validateRotationStructure(structure);
	return structure;
}
