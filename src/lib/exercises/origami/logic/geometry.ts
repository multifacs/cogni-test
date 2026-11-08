import type { Line, Mat, Pt } from '../types';

/** Точность сравнения с нулём для геометрических примитивов. */
export const GEO_EPS = 1e-9;

/** Единичная аффинная матрица. */
export function identityMat(): Mat {
	return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

/** Применяет матрицу к точке (SVG-соглашение). */
export function applyMat(m: Mat, p: Pt): Pt {
	return {
		x: m.a * p.x + m.c * p.y + m.e,
		y: m.b * p.x + m.d * p.y + m.f
	};
}

/**
 * Композиция: сначала применяется inner, затем outer.
 * composeMat(outer, inner) ≡ матрица произведения outer·inner.
 */
export function composeMat(outer: Mat, inner: Mat): Mat {
	return {
		a: outer.a * inner.a + outer.c * inner.b,
		b: outer.b * inner.a + outer.d * inner.b,
		c: outer.a * inner.c + outer.c * inner.d,
		d: outer.b * inner.c + outer.d * inner.d,
		e: outer.a * inner.e + outer.c * inner.f + outer.e,
		f: outer.b * inner.e + outer.d * inner.f + outer.f
	};
}

/** Знак выражения прямой в точке: сторона полуплоскости (±1, 0 — на линии). */
export function lineSign(line: Line, p: Pt): number {
	const v = line.a * p.x + line.b * p.y + line.c;
	if (v > GEO_EPS) return 1;
	if (v < -GEO_EPS) return -1;
	return 0;
}

/**
 * Матрица отражения относительно нормализованной прямой ax+by+c=0.
 * Требует a²+b²=1 (контракт конструкторов lineFrom*).
 */
export function reflectMat(line: Line): Mat {
	const { a, b, c } = line;
	// Отражение: p' = p − 2(a·px + b·py + c)·(a, b)
	return {
		a: 1 - 2 * a * a,
		b: -2 * a * b,
		c: -2 * a * b,
		d: 1 - 2 * b * b,
		e: -2 * a * c,
		f: -2 * b * c
	};
}

/** Отражает точку относительно прямой (нормализованной). */
export function reflectPoint(line: Line, p: Pt): Pt {
	return applyMat(reflectMat(line), p);
}

/** Прямая-горизонталь y = at (в SVG y вниз — визуально горизонтальный сгиб). */
export function lineFromHV(axis: 'h' | 'v', at: number): Line {
	return axis === 'h' ? { a: 0, b: 1, c: -at } : { a: 1, b: 0, c: -at };
}

/**
 * Прямая по нормали: нормаль (cos angle, sin angle), прямая задаётся
 * {x: n·p = offset} → x·cosθ + y·sinθ − offset = 0 (нормализовано).
 */
export function lineFromNormalOffset(angle: number, offset: number): Line {
	return { a: Math.cos(angle), b: Math.sin(angle), c: -offset };
}

/**
 * Отсечение выпуклого полигона полуплоскостью (Sutherland–Hodgman).
 * side = знак ax+by+c, который оставляем. Прямая, не пересекающая полигон,
 * возвращает его без изменений (если он на нужной стороне) либо пустой массив.
 */
export function clipHalfPlane(poly: Pt[], line: Line, side: 1 | -1): Pt[] {
	if (poly.length < 3) return [];
	const value = (p: Pt): number => line.a * p.x + line.b * p.y + line.c;
	const out: Pt[] = [];
	for (let i = 0; i < poly.length; i += 1) {
		const cur = poly[i];
		const next = poly[(i + 1) % poly.length];
		const dc = value(cur) * side;
		const dn = value(next) * side;
		const curIn = dc >= -GEO_EPS;
		const nextIn = dn >= -GEO_EPS;
		if (curIn) out.push(cur);
		if (curIn !== nextIn) {
			// Точка пересечения ребра с прямой: линейная интерполяция по знаку.
			const denom = dc - dn;
			const t = dc / denom;
			out.push({
				x: cur.x + (next.x - cur.x) * t,
				y: cur.y + (next.y - cur.y) * t
			});
		}
	}
	return out;
}

/** Площадь полигона (формула шнуровки, модуль). */
export function polyArea(poly: Pt[]): number {
	let sum = 0;
	for (let i = 0; i < poly.length; i += 1) {
		const p = poly[i];
		const q = poly[(i + 1) % poly.length];
		sum += p.x * q.y - q.x * p.y;
	}
	return Math.abs(sum) / 2;
}

/** Центроид полигона (центр масс по площади; для вырожденного — среднее вершин). */
export function polyCentroid(poly: Pt[]): Pt {
	let sx = 0;
	let sy = 0;
	let sa = 0;
	for (let i = 0; i < poly.length; i += 1) {
		const p = poly[i];
		const q = poly[(i + 1) % poly.length];
		const cross = p.x * q.y - q.x * p.y;
		sx += (p.x + q.x) * cross;
		sy += (p.y + q.y) * cross;
		sa += cross;
	}
	if (Math.abs(sa) < GEO_EPS) {
		const n = poly.length || 1;
		return {
			x: poly.reduce((acc, p) => acc + p.x, 0) / n,
			y: poly.reduce((acc, p) => acc + p.y, 0) / n
		};
	}
	return { x: sx / (3 * sa), y: sy / (3 * sa) };
}

/** AABB полигона (min/max по осям). */
export function polyBBox(poly: Pt[]): { minX: number; minY: number; maxX: number; maxY: number } {
	if (!poly.length) throw new Error('polyBBox: empty polygon');
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const p of poly) {
		if (p.x < minX) minX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.x > maxX) maxX = p.x;
		if (p.y > maxY) maxY = p.y;
	}
	return { minX, minY, maxX, maxY };
}

/**
 * Принадлежность точки выпуклому полигону (включая границу, с эпсилоном).
 * Ориентация полигона не важна: проверяем единый знак крестового произведения.
 */
export function pointInConvex(p: Pt, poly: Pt[], eps = GEO_EPS): boolean {
	if (poly.length < 3) return false;
	let sign = 0;
	for (let i = 0; i < poly.length; i += 1) {
		const a = poly[i];
		const b = poly[(i + 1) % poly.length];
		const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
		if (cross > eps) {
			if (sign < 0) return false;
			sign = 1;
		} else if (cross < -eps) {
			if (sign > 0) return false;
			sign = -1;
		}
	}
	return true;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
	const abx = b.x - a.x;
	const aby = b.y - a.y;
	const len2 = abx * abx + aby * aby;
	if (len2 < GEO_EPS) return Math.hypot(p.x - a.x, p.y - a.y);
	let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

/** Минимальное расстояние от точки до рёбер полигона (глубина внутри). */
export function distanceToPolyEdges(p: Pt, poly: Pt[]): number {
	if (poly.length < 2) return Infinity;
	let min = Infinity;
	for (let i = 0; i < poly.length; i += 1) {
		const d = distToSegment(p, poly[i], poly[(i + 1) % poly.length]);
		if (d < min) min = d;
	}
	return min;
}
