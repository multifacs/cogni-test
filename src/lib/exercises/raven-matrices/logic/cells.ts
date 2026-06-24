import type { CellElement, CellSpec, RegionKind, ShapeKind, TextureKind } from '../types';
import type { ContextKind, GridSlot } from './dictionaries';
import { GRID_POINTS, GRID_SLOTS } from './dictionaries';

let idCounter = 0;
function nextId(prefix: string) {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

export function resetCellIds() {
	idCounter = 0;
}

export function cell(elements: CellElement[], frame = false): CellSpec {
	return { id: nextId('cell'), elements, frame };
}

export function shapeElement(
	shape: ShapeKind,
	cx = 50,
	cy = 50,
	size = 44,
	options: Partial<Extract<CellElement, { type: 'shape' }>> = {}
): CellElement {
	return {
		type: 'shape',
		id: nextId('shape'),
		shape,
		cx,
		cy,
		size,
		fill: options.fill ?? 'white',
		stroke: options.stroke ?? '#172033',
		strokeWidth: options.strokeWidth ?? 4,
		rotation: options.rotation,
		texture: options.texture,
		opacity: options.opacity,
		...options
	};
}

export function dotElement(x: number, y: number, r = 4.2, fill = '#172033'): CellElement {
	return { type: 'dot', id: nextId('dot'), x, y, r, fill };
}

export function lineElement(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	strokeWidth = 4,
	dash?: string,
	stroke = '#172033'
): CellElement {
	return { type: 'line', id: nextId('line'), x1, y1, x2, y2, stroke, strokeWidth, dash };
}

export function contextElements(kind: ContextKind, stroke = '#667085'): CellElement[] {
	if (kind === 'circleFrame')
		return [shapeElement('circle', 50, 50, 78, { strokeWidth: 3.2, stroke })];
	if (kind === 'squareFrame')
		return [shapeElement('square', 50, 50, 76, { strokeWidth: 3.2, stroke })];
	if (kind === 'diagonals')
		return [
			lineElement(20, 20, 80, 80, 3.2, undefined, stroke),
			lineElement(80, 20, 20, 80, 3.2, undefined, stroke)
		];
	if (kind === 'cornerDots')
		return [
			dotElement(20, 20, 3.6, stroke),
			dotElement(80, 20, 3.6, stroke),
			dotElement(20, 80, 3.6, stroke),
			dotElement(80, 80, 3.6, stroke)
		];
	if (kind === 'axes')
		return [
			lineElement(50, 16, 50, 84, 3.2, undefined, stroke),
			lineElement(16, 50, 84, 50, 3.2, undefined, stroke)
		];
	return [
		dotElement(22, 50, 3.6, stroke),
		dotElement(78, 50, 3.6, stroke),
		dotElement(50, 22, 3.6, stroke),
		dotElement(50, 78, 3.6, stroke)
	];
}

export function attributeCell(
	shape: ShapeKind,
	context?: ContextKind,
	stroke = '#172033',
	options: { parityMarker?: boolean; fill?: string; size?: number; rotation?: number } = {}
): CellSpec {
	const elements = [...(context ? contextElements(context, '#8993a6') : [])];
	elements.push(
		shapeElement(shape, 50, 50, options.size ?? (context ? 31 : 46), {
			stroke,
			fill: options.fill ?? 'white',
			rotation: options.rotation
		})
	);
	if (options.parityMarker) elements.push(dotElement(50, 18, 3.4, stroke));
	return cell(elements, true);
}

function countCoords(count: number): [number, number][] {
	if (count <= 1) return [[50, 50]];
	if (count === 2)
		return [
			[37, 50],
			[63, 50]
		];
	if (count === 3)
		return [
			[50, 30],
			[34, 64],
			[66, 64]
		];
	if (count === 4)
		return [
			[35, 35],
			[65, 35],
			[35, 65],
			[65, 65]
		];
	if (count === 5)
		return [
			[32, 32],
			[68, 32],
			[50, 50],
			[32, 68],
			[68, 68]
		];
	return [
		[30, 32],
		[50, 32],
		[70, 32],
		[30, 68],
		[50, 68],
		[70, 68]
	];
}

export function countCell(shape: ShapeKind, count: number, stroke = '#172033'): CellSpec {
	const safe = Math.max(1, Math.min(6, count));
	const coords = countCoords(safe);
	const size = safe <= 2 ? 28 : safe <= 4 ? 22 : 18;
	return cell(
		coords.map(([cx, cy]) => shapeElement(shape, cx, cy, size, { stroke, strokeWidth: 3.6 })),
		true
	);
}

export function positionCell(
	shape: ShapeKind,
	slot: GridSlot,
	stroke = '#172033',
	size = 24
): CellSpec {
	const [x, y] = GRID_POINTS[slot];
	return cell([shapeElement(shape, x, y, size, { stroke, strokeWidth: 3.8 })], true);
}

export function markerMaskCell(
	mask: number,
	marker: ShapeKind = 'circle',
	fill = '#172033',
	gridSize: 2 | 3 = 3
): CellSpec {
	const slots = gridSize === 2 ? (['tl', 'tr', 'bl', 'br'] as GridSlot[]) : GRID_SLOTS;
	const elements: CellElement[] = [];
	for (const slot of slots) {
		const i = GRID_SLOTS.indexOf(slot);
		if (mask & (1 << i)) {
			const [x, y] = GRID_POINTS[slot];
			if (marker === 'circle')
				elements.push(dotElement(x, y, gridSize === 2 ? 5.1 : 4.6, fill));
			else
				elements.push(
					shapeElement(marker, x, y, gridSize === 2 ? 14 : 11.5, {
						fill,
						stroke: fill,
						strokeWidth: 2.2
					})
				);
		}
	}
	return cell(elements, true);
}

export function radialCell(
	mask: number,
	stroke = '#172033',
	variant: 'petal' | 'bar' | 'triangle' = 'petal',
	directions: 4 | 8 = 8
): CellSpec {
	const angles = directions === 4 ? [0, 90, 180, 270] : [0, 45, 90, 135, 180, 225, 270, 315];
	const elements: CellElement[] = [];
	for (let i = 0; i < angles.length; i += 1) {
		if (mask & (1 << i)) {
			elements.push({
				type: 'petal',
				id: nextId('petal'),
				angle: angles[i],
				variant,
				fill: '#fffdf8',
				stroke,
				strokeWidth: 3.4
			});
		}
	}
	if (elements.length > 1) elements.push(dotElement(50, 50, 3, stroke));
	return cell(elements, true);
}

export type RelationKind = 'separate' | 'overlapLeft' | 'overlapRight' | 'inside' | 'concentric';

export function nestedCell(
	outer: ShapeKind,
	inner: ShapeKind,
	relation: RelationKind,
	stroke = '#172033',
	innerStroke = stroke
): CellSpec {
	if (relation === 'separate') {
		return cell(
			[
				shapeElement(outer, 36, 50, 36, { stroke }),
				shapeElement(inner, 68, 50, 25, { stroke: innerStroke })
			],
			true
		);
	}
	if (relation === 'overlapLeft') {
		return cell(
			[
				shapeElement(outer, 46, 50, 42, { stroke }),
				shapeElement(inner, 59, 50, 29, { stroke: innerStroke }),
				dotElement(52, 50, 3.1, stroke)
			],
			true
		);
	}
	if (relation === 'overlapRight') {
		return cell(
			[
				shapeElement(outer, 54, 50, 42, { stroke }),
				shapeElement(inner, 41, 50, 29, { stroke: innerStroke }),
				dotElement(48, 50, 3.1, stroke)
			],
			true
		);
	}
	if (relation === 'concentric') {
		return cell(
			[
				shapeElement(outer, 50, 50, 58, { stroke }),
				shapeElement(inner, 50, 50, 38, { stroke: innerStroke }),
				dotElement(50, 50, 3.2, innerStroke)
			],
			true
		);
	}
	return cell(
		[
			shapeElement(outer, 50, 50, 56, { stroke }),
			shapeElement(inner, 50, 50, 27, { stroke: innerStroke }),
			dotElement(50, 50, 3.2, innerStroke)
		],
		true
	);
}

export function regionTextureCell(region: RegionKind, texture: TextureKind): CellSpec {
	return cell([{ type: 'region', id: nextId('region'), region, texture }], true);
}

export function overlayRegionCell(
	a: RegionKind,
	textureA: TextureKind,
	b: RegionKind,
	textureB: TextureKind,
	combined: TextureKind,
	mode: 'a' | 'b' | 'overlay'
): CellSpec {
	if (mode === 'a')
		return cell([{ type: 'region', id: nextId('region'), region: a, texture: textureA }], true);
	if (mode === 'b')
		return cell([{ type: 'region', id: nextId('region'), region: b, texture: textureB }], true);
	return cell(
		[
			{ type: 'region', id: nextId('region'), region: a, texture: textureA },
			{ type: 'region', id: nextId('region'), region: b, texture: textureB },
			{
				type: 'region',
				id: nextId('region'),
				region: intersectionRegion(a, b),
				texture: combined
			}
		],
		true
	);
}

export function overlayShapeCell(
	shapeA: ShapeKind,
	textureA: TextureKind,
	shapeB: ShapeKind,
	textureB: TextureKind,
	combined: TextureKind,
	mode: 'a' | 'b' | 'overlay'
): CellSpec {
	const a = shapeElement(shapeA, 43, 50, 52, {
		stroke: '#172033',
		texture: textureA,
		opacity: 0.96,
		strokeWidth: 3.2
	});
	const b = shapeElement(shapeB, 58, 50, 48, {
		stroke: '#172033',
		texture: textureB,
		opacity: 0.9,
		strokeWidth: 3.2
	});
	if (mode === 'a')
		return cell(
			[
				shapeElement(shapeA, 50, 50, 56, {
					stroke: '#172033',
					texture: textureA,
					strokeWidth: 3.2
				})
			],
			true
		);
	if (mode === 'b')
		return cell(
			[
				shapeElement(shapeB, 50, 50, 56, {
					stroke: '#172033',
					texture: textureB,
					strokeWidth: 3.2
				})
			],
			true
		);
	return cell(
		[
			a,
			b,
			shapeElement('diamond', 51, 50, 28, {
				stroke: '#172033',
				texture: combined,
				strokeWidth: 2.6
			})
		],
		true
	);
}

function intersectionRegion(a: RegionKind, b: RegionKind): RegionKind {
	const pair = [a, b].sort().join('|');
	if (pair.includes('leftHalf') && pair.includes('topHalf')) return 'topLeftQuadrant';
	if (pair.includes('rightHalf') && pair.includes('topHalf')) return 'topRightQuadrant';
	if (pair.includes('leftHalf') && pair.includes('bottomHalf')) return 'bottomLeftQuadrant';
	if (pair.includes('rightHalf') && pair.includes('bottomHalf')) return 'bottomRightQuadrant';
	return 'center';
}

export function cloneCellWithNewIds(source: CellSpec): CellSpec {
	return cell(
		source.elements.map((el) => ({ ...el, id: nextId(el.type) }) as CellElement),
		source.frame
	);
}
