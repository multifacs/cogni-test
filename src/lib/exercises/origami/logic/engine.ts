import type {
	FoldSpec,
	Line,
	OrigamiDifficulty,
	OrigamiOption,
	OrigamiStep,
	OrigamiTask,
	Piece,
	Pt
} from '../types';
import {
	applyMat,
	clipHalfPlane,
	composeMat,
	distanceToPolyEdges,
	identityMat,
	lineFromHV,
	lineFromNormalOffset,
	pointInConvex,
	polyArea,
	reflectMat,
	reflectPoint
} from './geometry';
import { chance, createRng, int, pick, shuffle } from './random';
import type { Rng } from './random';

const SHEET_SIZE = 100;
const OPTION_COUNT = 4;
/** Ниже этой площади кусок считаем вырожденным (нулевым). */
const MIN_PIECE_AREA = 1e-6;
/** Минимальный отступ точки прокола от рёбер куска (чтобы не попадать на границу). */
const PUNCTURE_MARGIN = 5;

/** Исходный лист: квадрат SHEET_SIZE × SHEET_SIZE в координатах стола. */
function sheetPiece(): Piece {
	return {
		poly: [
			{ x: 0, y: 0 },
			{ x: SHEET_SIZE, y: 0 },
			{ x: SHEET_SIZE, y: SHEET_SIZE },
			{ x: 0, y: SHEET_SIZE }
		],
		toSheet: identityMat()
	};
}

/**
 * Единственное место материализации FoldSpec → Line (parse-don't-validate):
 * за пределами engine.ts сгибы живут только как сериализуемые spec'и.
 */
export function materializeLine(spec: FoldSpec): Line {
	switch (spec.kind) {
		case 'h':
			return lineFromHV('h', spec.at);
		case 'v':
			return lineFromHV('v', spec.at);
		case 'diag':
			// tl: диагональ (0,0)–(S,S), уравнение y − x = 0;
			// tr: диагональ (S,0)–(0,S), уравнение x + y = S.
			return spec.corner === 'tl'
				? lineFromNormalOffset((3 * Math.PI) / 4, 0)
				: lineFromNormalOffset(Math.PI / 4, SHEET_SIZE / Math.SQRT2);
		case 'free':
			return lineFromNormalOffset(spec.angle, spec.offset);
	}
}

/**
 * Сгиб: каждый piece клипается обеими сторонами прямой; большая по площади
 * сторона остаётся на месте, меньшая перегибается — её полигон отражается
 * в координатах стола, а матрица в координаты листа получает отражение
 * справа: toSheet := toSheet ∘ reflectMat(line).
 */
export function applyFold(pieces: Piece[], line: Line): { pieces: Piece[]; movedPolys: Pt[][] } {
	const next: Piece[] = [];
	const movedPolys: Pt[][] = [];
	const refl = reflectMat(line);
	for (const piece of pieces) {
		const keep = clipHalfPlane(piece.poly, line, 1);
		const flip = clipHalfPlane(piece.poly, line, -1);
		const keepArea = polyArea(keep);
		const flipArea = polyArea(flip);
		if (keepArea < MIN_PIECE_AREA && flipArea < MIN_PIECE_AREA) continue;
		if (flipArea < MIN_PIECE_AREA) {
			next.push({ poly: keep, toSheet: piece.toSheet });
			continue;
		}
		if (keepArea < MIN_PIECE_AREA) {
			next.push({ poly: flip, toSheet: piece.toSheet });
			continue;
		}
		const stayPoly = keepArea >= flipArea ? keep : flip;
		const movePoly = keepArea >= flipArea ? flip : keep;
		const reflected = movePoly.map((v) => reflectPoint(line, v));
		next.push({ poly: stayPoly, toSheet: piece.toSheet });
		// Материал в новой table-позиции p' до сгиба находился в refl(p'):
		// toSheet_new = toSheet_old ∘ refl (composeMat(outer, inner): inner применяется первым).
		// Именно этот порядок гарантирует, что дырки остаются в пределах листа.
		next.push({ poly: reflected, toSheet: composeMat(piece.toSheet, refl) });
		movedPolys.push(reflected);
	}
	return { pieces: next, movedPolys };
}

/**
 * Прокол в точке p (координаты стола): дырка появляется в каждом слое,
 * содержащем p, на позиции toSheet(p) — уже в координатах листа.
 * Дальнейшие сгибы дырки не двигают.
 */
export function punctureHoles(pieces: Piece[], p: Pt): Pt[] {
	const holes: Pt[] = [];
	for (const piece of pieces) {
		if (pointInConvex(p, piece.poly)) holes.push(applyMat(piece.toSheet, p));
	}
	return holes;
}

function clonePieces(pieces: Piece[]): Piece[] {
	return pieces.map((p) => ({
		poly: p.poly.map((v) => ({ ...v })),
		toSheet: { ...p.toSheet }
	}));
}

function bboxOfPieces(pieces: Piece[]): {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
} {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const piece of pieces) {
		for (const v of piece.poly) {
			if (v.x < minX) minX = v.x;
			if (v.y < minY) minY = v.y;
			if (v.x > maxX) maxX = v.x;
			if (v.y > maxY) maxY = v.y;
		}
	}
	return { minX, minY, maxX, maxY };
}

function samplePointInBox(
	rng: Rng,
	box: { minX: number; minY: number; maxX: number; maxY: number }
): Pt {
	const loX = Math.ceil(box.minX);
	const hiX = Math.floor(box.maxX);
	const loY = Math.ceil(box.minY);
	const hiY = Math.floor(box.maxY);
	if (loX > hiX || loY > hiY) return { x: box.minX, y: box.minY };
	return { x: int(rng, loX, hiX), y: int(rng, loY, hiY) };
}

/** Точка прокола: внутри стопки, с отступом от рёбер (безопасно для подсчёта слоёв). */
function samplePuncturePoint(rng: Rng, pieces: Piece[]): Pt | null {
	if (!pieces.length) return null;
	const box = bboxOfPieces(pieces);
	for (let attempt = 0; attempt < 120; attempt += 1) {
		const p = samplePointInBox(rng, box);
		for (const piece of pieces) {
			if (
				pointInConvex(p, piece.poly) &&
				distanceToPolyEdges(p, piece.poly) >= PUNCTURE_MARGIN
			) {
				return p;
			}
		}
	}
	for (let attempt = 0; attempt < 120; attempt += 1) {
		const p = samplePointInBox(rng, box);
		for (const piece of pieces) {
			if (pointInConvex(p, piece.poly)) return p;
		}
	}
	return null;
}

/** Случайный FoldSpec; free-сгиб допустим только на не-первом сгибе medium/hard. */
function sampleFoldSpec(rng: Rng, allowFree: boolean): FoldSpec {
	if (allowFree && chance(rng, 0.25)) {
		const angle = (int(rng, 0, 11) * Math.PI) / 6;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const projections = [0, SHEET_SIZE].flatMap((cx) =>
			[0, SHEET_SIZE].map((cy) => cos * cx + sin * cy)
		);
		const lo = Math.ceil(Math.min(...projections)) + 10;
		const hi = Math.floor(Math.max(...projections)) - 10;
		if (lo <= hi) return { kind: 'free', angle, offset: int(rng, lo, hi) };
	}
	const kind = pick(rng, ['h', 'v', 'diag'] as const);
	if (kind === 'h') return { kind: 'h', at: int(rng, 25, 75) };
	if (kind === 'v') return { kind: 'v', at: int(rng, 25, 75) };
	return { kind: 'diag', corner: pick(rng, ['tl', 'tr'] as const) };
}

function round4(v: number): number {
	return Math.round(v * 1e4) / 1e4;
}

/** Ключ набора дырок для дедупликации опций. */
function holesKey(holes: Pt[]): string {
	return holes
		.slice()
		.sort((a, b) => a.x - b.x || a.y - b.y)
		.map((h) => `${round4(h.x)},${round4(h.y)}`)
		.join(';');
}

/** Прогон сценария (сгибы + прокол в заданный момент) — возвращает дырки. */
function simulate(folds: FoldSpec[], punctureAfter: number, point: Pt): Pt[] {
	let pieces = [sheetPiece()];
	let holes: Pt[] = [];
	for (let i = 0; i < folds.length; i += 1) {
		pieces = applyFold(pieces, materializeLine(folds[i])).pieces;
		if (i + 1 === punctureAfter) holes = punctureHoles(pieces, point);
	}
	return holes;
}

function foldCountFor(difficulty: OrigamiDifficulty): number {
	return difficulty === 'simple' ? 1 : 2;
}

/** Прокол после первого сгиба на hard; на simple/medium — после всех сгибов. */
function punctureAfterFor(difficulty: OrigamiDifficulty): number {
	return difficulty === 'hard' ? 1 : foldCountFor(difficulty);
}

function tryBuild(
	rng: Rng,
	seed: string,
	taskIndex: number,
	difficulty: OrigamiDifficulty
): OrigamiTask | null {
	const foldCount = foldCountFor(difficulty);
	const punctureAfter = punctureAfterFor(difficulty);

	const folds: FoldSpec[] = [];
	const steps: OrigamiStep[] = [];
	const dots: Pt[] = [];
	let pieces = [sheetPiece()];
	let puncturePoint: Pt | null = null;
	let correctHoles: Pt[] | null = null;
	let piecesAtPuncture: Piece[] | null = null;

	steps.push({ kind: 'sheet', pieces: clonePieces(pieces), dots: [] });

	for (let i = 0; i < foldCount; i += 1) {
		const allowFree = difficulty !== 'simple' && i > 0;
		let spec: FoldSpec | null = null;
		for (let attempt = 0; attempt < 30; attempt += 1) {
			const candidate = sampleFoldSpec(rng, allowFree);
			if (applyFold(pieces, materializeLine(candidate)).movedPolys.length) {
				spec = candidate;
				break;
			}
		}
		if (!spec) return null;
		folds.push(spec);

		const line = materializeLine(spec);
		const { pieces: folded, movedPolys } = applyFold(pieces, line);
		pieces = folded;
		steps.push({
			kind: 'fold',
			pieces: clonePieces(pieces),
			crease: line,
			movedPolys,
			dots: [...dots]
		});

		if (i + 1 === punctureAfter) {
			const p = samplePuncturePoint(rng, pieces);
			if (!p) return null;
			const holes = punctureHoles(pieces, p);
			if (!holes.length) return null;
			puncturePoint = p;
			correctHoles = holes;
			piecesAtPuncture = pieces;
			dots.push(p);
			steps.push({ kind: 'puncture', pieces: clonePieces(pieces), dots: [...dots] });
		}
	}

	if (!puncturePoint || !correctHoles || !piecesAtPuncture) return null;

	// Дистракторы: та же последовательность действий, другая финальная точка прокола.
	const stack = piecesAtPuncture;
	const used = new Set([holesKey(correctHoles)]);
	const distractors: OrigamiOption[] = [];
	const offsets = shuffle(rng, [
		{ x: -22, y: 0 },
		{ x: 22, y: 0 },
		{ x: 0, y: -22 },
		{ x: 0, y: 22 },
		{ x: -16, y: -16 },
		{ x: 16, y: -16 },
		{ x: -16, y: 16 },
		{ x: 16, y: 16 }
	] as Pt[]);
	const box = bboxOfPieces(stack);
	let guard = 0;
	while (distractors.length < OPTION_COUNT - 1 && guard < 300) {
		const candidate: Pt =
			guard < offsets.length
				? { x: puncturePoint.x + offsets[guard].x, y: puncturePoint.y + offsets[guard].y }
				: samplePointInBox(rng, box);
		guard += 1;
		const holes = simulate(folds, punctureAfter, candidate);
		if (!holes.length) continue;
		const key = holesKey(holes);
		if (used.has(key)) continue;
		used.add(key);
		distractors.push({ holes });
	}
	if (distractors.length < OPTION_COUNT - 1) return null;

	const marked = shuffle(rng, [
		{ holes: correctHoles, correct: true },
		...distractors.map((d) => ({ holes: d.holes, correct: false }))
	]);
	const options: OrigamiOption[] = marked.map((m) => ({ holes: m.holes }));
	const correctIndex = marked.findIndex((m) => m.correct);

	return { seed, taskIndex, difficulty, folds, steps, options, correctIndex };
}

/** Генерация задачи «Оригами» из seed + сложности. Чистая, детерминированная. */
export function generateOrigamiTask(params: {
	seed: string;
	difficulty: OrigamiDifficulty;
	taskIndex?: number;
}): OrigamiTask {
	const taskIndex = params.taskIndex ?? 1;
	for (let attempt = 0; attempt < 40; attempt += 1) {
		const rng = createRng(`${params.seed}:${params.difficulty}:${taskIndex}:${attempt}`);
		const task = tryBuild(rng, params.seed, taskIndex, params.difficulty);
		if (task) return task;
	}
	throw new Error(`generateOrigamiTask: не удалось построить задачу (seed=${params.seed})`);
}
