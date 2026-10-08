import { describe, expect, it } from 'vitest';
import type { CellShape, RotationCell, RotationProjection, RotationStructure } from '../types';
import { generateRotationTask } from './generator';
import { orthographicProjections, projectPoint, reconstructFromProjections } from './projection';

const GRID = 4;
const SEEDS_PER_DIFFICULTY = 50;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

function canonicalCells(cells: RotationCell[]): string[] {
	return cells.map((cell) => `${cell.x},${cell.y},${cell.z}:${cell.shape}`).sort();
}

describe('projectPoint view consistency', () => {
	it('front view (yaw 0, pitch 0): sx grows with x, sy shrinks as z grows, depth grows as y shrinks', () => {
		const base = projectPoint({ x: 0, y: 0, z: 0 }, 0, 0, GRID);
		const rightward = projectPoint({ x: 2, y: 0, z: 0 }, 0, 0, GRID);
		const upward = projectPoint({ x: 0, y: 0, z: 2 }, 0, 0, GRID);
		const frontRow = projectPoint({ x: 0, y: 0, z: 0 }, 0, 0, GRID);
		const backRow = projectPoint({ x: 0, y: 2, z: 0 }, 0, 0, GRID);

		expect(rightward.sx).toBeGreaterThan(base.sx);
		expect(upward.sy).toBeLessThan(base.sy);
		expect(frontRow.depth).toBeGreaterThan(backRow.depth);
	});

	it('right view (yaw -90, pitch 0): sx grows with y and larger x is nearer to the camera', () => {
		const base = projectPoint({ x: 0, y: 0, z: 0 }, -90, 0, GRID);
		const yRightward = projectPoint({ x: 0, y: 2, z: 0 }, -90, 0, GRID);
		const rightSide = projectPoint({ x: 2, y: 0, z: 0 }, -90, 0, GRID);

		expect(yRightward.sx).toBeGreaterThan(base.sx);
		expect(rightSide.depth).toBeGreaterThan(base.depth);
	});

	it('centers the structure on the origin when gridSize is provided', () => {
		const low = projectPoint({ x: 0, y: 0, z: 0 }, 30, 15, GRID);
		const high = projectPoint({ x: 3, y: 3, z: 3 }, 30, 15, GRID);
		expect(low.sx + high.sx).toBeCloseTo(0);
		expect(low.sy + high.sy).toBeCloseTo(0);
		expect(low.depth + high.depth).toBeCloseTo(0);
	});

	it('is pure: identical inputs yield identical outputs', () => {
		const point = { x: 1, y: 2, z: 0 };
		expect(projectPoint(point, 45, -20, GRID)).toEqual(projectPoint(point, 45, -20, GRID));
	});

	it('fails loudly on non-finite coordinates', () => {
		expect(() => projectPoint({ x: Number.NaN, y: 0, z: 0 }, 0, 0)).toThrow();
		expect(() => projectPoint({ x: 0, y: 0, z: 0 }, Number.POSITIVE_INFINITY, 0)).toThrow();
	});
});

describe('reconstruction from two orthographic projections', () => {
	it.each(DIFFICULTIES)('round-trips occupancy and shapes for 50 seeds (%s)', (difficulty) => {
		for (let seedIndex = 0; seedIndex < SEEDS_PER_DIFFICULTY; seedIndex += 1) {
			const task = generateRotationTask(difficulty, `rot-proj-${difficulty}-${seedIndex}`, 1);
			const original: RotationStructure = task.structure;
			const views = orthographicProjections(original);
			const restored = reconstructFromProjections(views.front, views.right, original.size);

			expect(restored.size).toBe(original.size);
			expect(restored.layers).toBe(original.layers);
			expect(canonicalCells(restored.cells)).toEqual(canonicalCells(original.cells));
		}
	});
});

describe('reconstructFromProjections fail-loud behavior', () => {
	it('throws on mismatched view lengths, ragged rows, empty rows, gaps, mixed shapes and cross-view disagreement', () => {
		const task = generateRotationTask('easy', 'rot-proj-bad', 1);
		const structure = task.structure;
		const views = orthographicProjections(structure);
		const size = structure.size;

		const mismatchedLayers: RotationProjection[] = [views.front.slice(0, 1), views.right];
		expect(() => reconstructFromProjections(mismatchedLayers[0], views.right, size)).toThrow();

		const raggedFront: RotationProjection = views.front.map((row, z) =>
			z === 0 ? row.slice(0, size - 1) : [...row]
		);
		expect(() => reconstructFromProjections(raggedFront, views.right, size)).toThrow();

		const emptyRow: RotationProjection = views.front.map((row, z) =>
			z === 0 ? (Array.from({ length: size }, () => null) as Array<null>) : [...row]
		);
		expect(() => reconstructFromProjections(emptyRow, views.right, size)).toThrow();

		const withGap: RotationProjection = views.front.map((row, z) => {
			if (z !== 0) return [...row];
			const copy: Array<CellShape | null> = [...row];
			copy[size - 1] = null;
			return copy;
		});
		expect(() => reconstructFromProjections(withGap, views.right, size)).toThrow();

		const mixedShapes: RotationProjection = views.front.map((row, z) => {
			if (z !== 0) return [...row];
			const copy: Array<CellShape | null> = [...row];
			copy[size - 1] = copy[size - 1] === 'cube' ? 'sphere' : 'cube';
			return copy;
		});
		expect(() => reconstructFromProjections(mixedShapes, views.right, size)).toThrow();

		// Right row stays internally uniform but disagrees with the front row's shape.
		const disagreeingRight: RotationProjection = views.right.map((row, z) => {
			if (z !== 0) return [...row];
			const flipped: CellShape = row[0] === 'cube' ? 'sphere' : 'cube';
			return row.map((value) => (value === null ? null : flipped));
		});
		expect(() => reconstructFromProjections(views.front, disagreeingRight, size)).toThrow();
	});
});
