import { describe, expect, it } from 'vitest';
import type { RotationCell, RotationDifficulty, RotationStructure } from '../types';
import { DIFFICULTY_GRID } from '../types';
import {
	fillBounds,
	generateRotationSession,
	generateRotationTask,
	validateRotationStructure
} from './generator';

const DIFFICULTIES: RotationDifficulty[] = ['easy', 'medium', 'hard'];
const SEEDS_PER_DIFFICULTY = 50;

function cellKey(cell: RotationCell): string {
	return `${cell.x},${cell.y},${cell.z}`;
}

function optionKey(cells: RotationCell[]): string {
	return cells.map((cell) => `${cell.x},${cell.y},${cell.z}:${cell.shape}`).join('|');
}

/** Independent BFS over 6-neighbors — must reach every occupied cell. */
function reachableCells(cells: RotationCell[]): Set<string> {
	const occupied = new Set(cells.map(cellKey));
	if (!cells.length) return occupied;
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
	return visited;
}

/** Checks ALL structure invariants from the spec against the given structure. */
function checkStructure(structure: RotationStructure): void {
	const { size, cells, layers } = structure;
	expect(Number.isInteger(size)).toBe(true);

	// Invariant 1: single face-connected component.
	expect(reachableCells(cells).size).toBe(cells.length);

	// Invariant 2: occupied layers are consecutive starting from z = 0.
	const layerSet = new Set(cells.map((cell) => cell.z));
	expect(layerSet.size).toBe(layers);
	for (let z = 0; z < layers; z += 1) {
		expect(layerSet.has(z)).toBe(true);
	}

	for (let z = 0; z < layers; z += 1) {
		const layerCells = cells.filter((cell) => cell.z === z);

		// Invariant 5: per-layer uniform cell shape.
		const shapes = new Set(layerCells.map((cell) => cell.shape));
		expect(shapes.size).toBe(1);

		// Invariant 3: continuous L-shape along the two outer sides.
		const frontXs = layerCells
			.filter((cell) => cell.y === 0)
			.map((cell) => cell.x)
			.sort((a, b) => a - b);
		expect(frontXs.length).toBeGreaterThanOrEqual(1);
		expect(frontXs[frontXs.length - 1]).toBe(size - 1);
		frontXs.forEach((x, index) => expect(x).toBe(size - frontXs.length + index));

		const rightYs = layerCells
			.filter((cell) => cell.x === size - 1)
			.map((cell) => cell.y)
			.sort((a, b) => a - b);
		expect(rightYs.length).toBeGreaterThanOrEqual(1);
		rightYs.forEach((y, index) => expect(y).toBe(index));

		// The corner cell is mandatory in every occupied layer.
		expect(layerCells.some((cell) => cell.x === size - 1 && cell.y === 0)).toBe(true);

		// No cells outside the two arms.
		for (const cell of layerCells) {
			const inFrontArm = cell.y === 0 && cell.x >= size - frontXs.length;
			const inRightArm = cell.x === size - 1 && cell.y < rightYs.length;
			expect(inFrontArm || inRightArm).toBe(true);
		}
	}

	// Invariant 4: fill fraction within the clamped 20–50 % band.
	const bounds = fillBounds(size);
	expect(cells.length).toBeGreaterThanOrEqual(bounds.min);
	expect(cells.length).toBeLessThanOrEqual(bounds.max);
}

describe.each(DIFFICULTIES)('generateRotationTask structure invariants (%s)', (difficulty) => {
	it(`holds every invariant for ${SEEDS_PER_DIFFICULTY} seeds`, () => {
		for (let seedIndex = 0; seedIndex < SEEDS_PER_DIFFICULTY; seedIndex += 1) {
			const task = generateRotationTask(difficulty, `rot-inv-${difficulty}-${seedIndex}`, 1);
			checkStructure(task.structure);
			expect(task.gridSize).toBe(DIFFICULTY_GRID[difficulty]);
			expect(task.structure.size).toBe(DIFFICULTY_GRID[difficulty]);
			expect(task.taskIndex).toBe(1);
			expect(task.seed).toBe(`rot-inv-${difficulty}-${seedIndex}`);
			expect(task.id.length).toBeGreaterThan(0);
		}
	});
});

describe('rotation angles', () => {
	function distanceToNearestRightAngle(deg: number): number {
		const remainder = ((deg % 90) + 90) % 90;
		return Math.min(remainder, 90 - remainder);
	}

	it.each(DIFFICULTIES)(
		'keeps yaw >= 20 degrees from every multiple of 90 (%s)',
		(difficulty) => {
			for (let seedIndex = 0; seedIndex < SEEDS_PER_DIFFICULTY; seedIndex += 1) {
				const task = generateRotationTask(difficulty, `rot-yaw-${seedIndex}`, 2);
				expect(task.rotation.yawDeg).toBeGreaterThanOrEqual(20);
				expect(task.rotation.yawDeg).toBeLessThanOrEqual(340);
				expect(distanceToNearestRightAngle(task.rotation.yawDeg)).toBeGreaterThanOrEqual(
					20
				);
			}
		}
	);

	it.each(DIFFICULTIES)(
		'keeps pitch magnitude within [10, 35] with either sign (%s)',
		(difficulty) => {
			for (let seedIndex = 0; seedIndex < SEEDS_PER_DIFFICULTY; seedIndex += 1) {
				const task = generateRotationTask(difficulty, `rot-pitch-${seedIndex}`, 2);
				const { pitchDeg } = task.rotation;
				expect(Math.abs(pitchDeg)).toBeGreaterThanOrEqual(10);
				expect(Math.abs(pitchDeg)).toBeLessThanOrEqual(35);
			}
		}
	);
});

describe('answer options', () => {
	it('produces 4 options over the same occupancy with a distinct flipped-shape distractor set', () => {
		for (let seedIndex = 0; seedIndex < SEEDS_PER_DIFFICULTY; seedIndex += 1) {
			const task = generateRotationTask('medium', `rot-opt-${seedIndex}`, 3);
			const { options, correctIndex, structure } = task;

			expect(options).toHaveLength(4);
			expect(correctIndex).toBeGreaterThanOrEqual(0);
			expect(correctIndex).toBeLessThanOrEqual(3);

			// Pairwise distinct (occupancy + shapes).
			const keys = new Set(options.map(optionKey));
			expect(keys.size).toBe(4);

			const occupancy = new Set(structure.cells.map(cellKey));
			for (const option of options) {
				// Same structure: identical occupancy.
				expect(option).toHaveLength(structure.cells.length);
				expect(new Set(option.map(cellKey))).toEqual(occupancy);
			}

			// Correct option reproduces the original shapes.
			expect(optionKey(options[correctIndex])).toBe(optionKey(structure.cells));

			// Each distractor flips the shape of 1..3 occupied cells.
			options.forEach((option, index) => {
				if (index === correctIndex) return;
				const differing = option.filter(
					(cell, i) => cell.shape !== structure.cells[i].shape
				).length;
				expect(differing).toBeGreaterThanOrEqual(1);
				expect(differing).toBeLessThanOrEqual(3);
			});
		}
	});
});

describe('generateRotationSession', () => {
	it('builds exactly 9 tasks: 3 easy (grid 3), 3 medium (grid 4), 3 hard (grid 6), taskIndex 1..9', () => {
		const tasks = generateRotationSession('session-seed');
		expect(tasks).toHaveLength(9);
		expect(tasks.map((task) => task.difficulty)).toEqual([
			'easy',
			'easy',
			'easy',
			'medium',
			'medium',
			'medium',
			'hard',
			'hard',
			'hard'
		]);
		expect(tasks.map((task) => task.gridSize)).toEqual([3, 3, 3, 4, 4, 4, 6, 6, 6]);
		expect(tasks.map((task) => task.taskIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		for (const task of tasks) {
			checkStructure(task.structure);
		}
	});

	it('is deterministic for the same seed', () => {
		expect(generateRotationSession('deterministic-seed')).toEqual(
			generateRotationSession('deterministic-seed')
		);
	});
});

describe('validateRotationStructure fail-loud behavior', () => {
	it('rejects broken arm runs, out-of-bounds cells, mixed layer shapes and empty structures', () => {
		const task = generateRotationTask('easy', 'rot-bad', 1);
		const structure = task.structure;

		const withoutCorner: RotationStructure = {
			...structure,
			cells: structure.cells.filter(
				(cell) => !(cell.x === structure.size - 1 && cell.y === 0 && cell.z === 0)
			)
		};
		expect(() => validateRotationStructure(withoutCorner)).toThrow();

		const outOfBounds: RotationStructure = {
			...structure,
			cells: [...structure.cells, { x: 99, y: 0, z: 0, shape: 'cube' }]
		};
		expect(() => validateRotationStructure(outOfBounds)).toThrow();

		const mixedShapes: RotationStructure = {
			...structure,
			cells: structure.cells.map((cell, index) =>
				index === 0 ? { ...cell, shape: cell.shape === 'cube' ? 'sphere' : 'cube' } : cell
			)
		};
		expect(() => validateRotationStructure(mixedShapes)).toThrow();

		const empty: RotationStructure = { ...structure, cells: [], layers: 0 };
		expect(() => validateRotationStructure(empty)).toThrow();
	});
});
