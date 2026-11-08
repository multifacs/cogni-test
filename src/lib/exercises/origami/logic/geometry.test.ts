import { describe, expect, it } from 'vitest';
import type { Line, Pt } from '../types';
import {
	clipHalfPlane,
	lineFromHV,
	lineFromNormalOffset,
	pointInConvex,
	polyArea,
	polyBBox,
	polyCentroid,
	reflectPoint
} from './geometry';

const SQUARE: Pt[] = [
	{ x: 0, y: 0 },
	{ x: 100, y: 0 },
	{ x: 100, y: 100 },
	{ x: 0, y: 100 }
];

const TRIANGLE: Pt[] = [
	{ x: 0, y: 0 },
	{ x: 10, y: 0 },
	{ x: 0, y: 10 }
];

function expectClose(a: number, b: number, eps = 1e-6): void {
	expect(Math.abs(a - b)).toBeLessThanOrEqual(eps);
}

function expectPtClose(a: Pt, b: Pt, eps = 1e-6): void {
	expectClose(a.x, b.x, eps);
	expectClose(a.y, b.y, eps);
}

describe('clipHalfPlane', () => {
	it('режет квадрат вертикальной прямой на два прямоугольника равной площади', () => {
		const line = lineFromHV('v', 50);
		const left = clipHalfPlane(SQUARE, line, -1);
		const right = clipHalfPlane(SQUARE, line, 1);
		expect(polyArea(left)).toBeCloseTo(5000, 6);
		expect(polyArea(right)).toBeCloseTo(5000, 6);
		expect(polyArea(left) + polyArea(right)).toBeCloseTo(polyArea(SQUARE), 6);
	});

	it('режет квадрат диагональю на два равных треугольника', () => {
		const line = lineFromNormalOffset((3 * Math.PI) / 4, 0); // y = x
		const below = clipHalfPlane(SQUARE, line, -1);
		const above = clipHalfPlane(SQUARE, line, 1);
		expect(polyArea(below)).toBeCloseTo(5000, 6);
		expect(polyArea(above)).toBeCloseTo(5000, 6);
	});

	it('возвращает полигон без изменений, если прямая его не пересекает', () => {
		const line: Line = { a: 1, b: 0, c: -200 }; // x = 200
		const kept = clipHalfPlane(SQUARE, line, -1);
		const dropped = clipHalfPlane(SQUARE, line, 1);
		expect(polyArea(kept)).toBeCloseTo(10000, 6);
		expect(dropped).toEqual([]);
	});

	it('пустая сторона, когда полигон целиком по одну сторону', () => {
		const line = lineFromHV('h', 200); // y = 200, квадрат целиком выше (y < 200)
		expect(clipHalfPlane(SQUARE, line, 1)).toEqual([]);
		expect(polyArea(clipHalfPlane(SQUARE, line, -1))).toBeCloseTo(10000, 6);
	});

	it('прямая, проходящая по границе полигона, не режет его', () => {
		const line = lineFromHV('v', 0); // x = 0 — левая грань квадрата
		const kept = clipHalfPlane(SQUARE, line, 1);
		const dropped = clipHalfPlane(SQUARE, line, -1);
		expect(polyArea(kept)).toBeCloseTo(10000, 6);
		expect(polyArea(dropped)).toBeCloseTo(0, 9);
	});
});

describe('reflectPoint / reflectMat', () => {
	it('инволютивен: двойное отражение возвращает исходную точку', () => {
		const lines: Line[] = [
			lineFromHV('h', 30),
			lineFromHV('v', 70),
			lineFromNormalOffset((3 * Math.PI) / 4, 0),
			lineFromNormalOffset(Math.PI / 4, 100 / Math.SQRT2),
			lineFromNormalOffset(0.7, 40)
		];
		const points: Pt[] = [
			{ x: 12, y: 34 },
			{ x: 99, y: 1 },
			{ x: 50, y: 50 }
		];
		for (const line of lines) {
			for (const p of points) {
				expectPtClose(reflectPoint(line, reflectPoint(line, p)), p);
			}
		}
	});

	it('точки на прямой неподвижны', () => {
		const line = lineFromNormalOffset(0.7, 40);
		const onLine: Pt = { x: 40 * Math.cos(0.7), y: 40 * Math.sin(0.7) };
		expectPtClose(reflectPoint(line, onLine), onLine);
		const hLine = lineFromHV('h', 25);
		expectPtClose(reflectPoint(hLine, { x: 77, y: 25 }), { x: 77, y: 25 });
	});

	it('отражение относительно y = x меняет координаты местами', () => {
		const line = lineFromNormalOffset((3 * Math.PI) / 4, 0); // y = x
		expectPtClose(reflectPoint(line, { x: 20, y: 80 }), { x: 80, y: 20 });
	});

	it('отражение относительно вертикали x = 50 зеркалит абсциссу', () => {
		const line = lineFromHV('v', 50);
		expectPtClose(reflectPoint(line, { x: 25, y: 40 }), { x: 75, y: 40 });
	});
});

describe('pointInConvex', () => {
	it('внутри — true, вне — false', () => {
		expect(pointInConvex({ x: 50, y: 50 }, SQUARE)).toBe(true);
		expect(pointInConvex({ x: 150, y: 50 }, SQUARE)).toBe(false);
		expect(pointInConvex({ x: -1, y: -1 }, SQUARE)).toBe(false);
		expect(pointInConvex({ x: 3, y: 3 }, TRIANGLE)).toBe(true);
		expect(pointInConvex({ x: 8, y: 8 }, TRIANGLE)).toBe(false);
	});

	it('граница считается принадлежащей полигону', () => {
		expect(pointInConvex({ x: 50, y: 0 }, SQUARE)).toBe(true);
		expect(pointInConvex({ x: 0, y: 50 }, SQUARE)).toBe(true);
		expect(pointInConvex({ x: 100, y: 100 }, SQUARE)).toBe(true);
	});

	it('ориентация полигона не важна', () => {
		const reversed = [...SQUARE].reverse();
		expect(pointInConvex({ x: 50, y: 50 }, reversed)).toBe(true);
		expect(pointInConvex({ x: 150, y: 50 }, reversed)).toBe(false);
	});
});

describe('polyArea / polyCentroid / polyBBox', () => {
	it('polyArea: квадрат, треугольник, нечувствительность к обходу', () => {
		expect(polyArea(SQUARE)).toBeCloseTo(10000, 6);
		expect(polyArea(TRIANGLE)).toBeCloseTo(50, 6);
		expect(polyArea([...SQUARE].reverse())).toBeCloseTo(10000, 6);
	});

	it('polyCentroid: центр квадрата и центроид треугольника', () => {
		expectPtClose(polyCentroid(SQUARE), { x: 50, y: 50 });
		expectPtClose(polyCentroid(TRIANGLE), { x: 10 / 3, y: 10 / 3 });
		expectPtClose(polyCentroid([...TRIANGLE].reverse()), { x: 10 / 3, y: 10 / 3 });
	});

	it('polyCentroid: вырожденный полигон — среднее вершин', () => {
		const degenerate: Pt[] = [
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
			{ x: 20, y: 20 }
		];
		expectPtClose(polyCentroid(degenerate), { x: 10, y: 10 });
	});

	it('polyBBox: min/max по осям', () => {
		expect(polyBBox(TRIANGLE)).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
		expect(polyBBox(SQUARE)).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
	});
});

describe('нормализация lineFrom*', () => {
	it('a² + b² = 1 для всех конструкторов', () => {
		const lines: Line[] = [
			lineFromHV('h', 33),
			lineFromHV('v', 71),
			lineFromNormalOffset(0.3, 15),
			lineFromNormalOffset((3 * Math.PI) / 4, 0),
			lineFromNormalOffset(2.9, -5)
		];
		for (const line of lines) {
			expectClose(line.a * line.a + line.b * line.b, 1);
		}
	});

	it('lineFromHV проходит через заявленную координату', () => {
		const h = lineFromHV('h', 37);
		expectClose(h.a * 10 + h.b * 37 + h.c, 0);
		const v = lineFromHV('v', 63);
		expectClose(v.a * 63 + v.b * 10 + v.c, 0);
	});

	it('lineFromNormalOffset: точка offset·(cosθ, sinθ) лежит на прямой', () => {
		const angle = 1.1;
		const offset = 42;
		const line = lineFromNormalOffset(angle, offset);
		const p: Pt = { x: offset * Math.cos(angle), y: offset * Math.sin(angle) };
		expectClose(line.a * p.x + line.b * p.y + line.c, 0);
	});
});
