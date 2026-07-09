import type {
	CellSpec,
	ColorPolicy,
	DifficultyLevel,
	DistractorFamily,
	GeneratedRavenTask,
	RavenAnswerOption,
	RavenGenerationOptions,
	RavenTestGenerationOptions,
	RuleFamily,
	RuleSpec,
	ShapeKind,
	TaskClass,
	TextureKind
} from '../types';
import {
	attributeCell,
	cell,
	cloneCellWithNewIds,
	countCell,
	markerMaskCell,
	nestedCell,
	overlayRegionCell,
	overlayShapeCell,
	positionCell,
	radialCell,
	regionTextureCell,
	resetCellIds,
	shapeElement
} from './cells';
import type { RelationKind } from './cells';
import {
	BASIC_REGIONS,
	COLOR_KEYS,
	CONTEXTS,
	GRID_2X2_SLOTS,
	GRID_SLOTS,
	MARKER_SHAPES,
	OBJECT_COLORS,
	PATTERN_TEXTURES,
	REGIONS,
	SHAPES,
	SIMPLE_SHAPES,
	TEXTURES
} from './dictionaries';
import type { GridSlot } from './dictionaries';
import { estimateDifficulty } from './difficulty';
import { createRng, int, pick, sample, shuffle } from './random';
import type { Rng } from './random';

const GENERATOR_VERSION = '0.2.0';
const DEFAULT_ANSWER_COUNT = 6;
const UNIFORM_STROKE = OBJECT_COLORS.navy;

const DEFAULT_TASK_CLASSES: TaskClass[] = [
	'attribute_reasoning',
	'row_column_factorization',
	'quantity_reasoning',
	'spatial_movement',
	'grid_bitmask',
	'logical_set_reasoning',
	'structural_composition',
	'regional_texture_reasoning'
];

type TaskFactory = (
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
) => GeneratedRavenTask;

type DraftTask = Omit<GeneratedRavenTask, 'difficulty'>;

type BuildMeta = {
	level: DifficultyLevel;
	variant: string;
	colorPolicy: ColorPolicy;
	missingPolicy: 'bottom_right' | 'random_safe';
};

export function generateRavenTest(options: RavenTestGenerationOptions = {}): GeneratedRavenTask[] {
	const count = options.count ?? 10;
	const baseSeed = options.seed ?? `raven-${Date.now()}`;

	if (options.mode === 'diagnostic') {
		const plan = createDiagnosticPlan(options);
		return plan.slice(0, count).map((item, index) =>
			generateRavenTask(
				{
					...options,
					seed: `${baseSeed}-diag-${item.taskClass}-${item.level}-${index + 1}`,
					allowedTaskClasses: [item.taskClass],
					difficulty: { exact: item.level }
				},
				index + 1
			)
		);
	}

	return Array.from({ length: count }, (_, index) =>
		generateRavenTask({ ...options, seed: `${baseSeed}-${index + 1}` }, index + 1)
	);
}

function createDiagnosticPlan(
	options: RavenTestGenerationOptions
): Array<{ taskClass: TaskClass; level: DifficultyLevel }> {
	const classes = allowedTaskClasses(options);
	const plan: Array<{ taskClass: TaskClass; level: DifficultyLevel }> = [];
	for (const taskClass of classes) {
		for (const level of [1, 2, 3] as DifficultyLevel[]) plan.push({ taskClass, level });
	}
	return plan;
}

export function generateRavenTask(
	options: RavenGenerationOptions = {},
	taskIndex = 1
): GeneratedRavenTask {
	const baseSeed = options.seed ?? `raven-task-${Date.now()}-${taskIndex}`;
	let lastTask: GeneratedRavenTask | null = null;

	for (let attempt = 0; attempt < 80; attempt += 1) {
		const seed = `${baseSeed}-try-${attempt}`;
		const rng = createRng(seed);
		resetCellIds();

		const level = selectLevel(rng, options);
		const taskClass = selectTaskClass(rng, options);
		const task = factoryFor(taskClass)(rng, seed, taskIndex, options, level);
		lastTask = task;

		if (!rulesAllowed(task, options)) continue;
		return task;
	}

	return (
		lastTask ??
		factoryFor('row_column_factorization')(
			createRng(baseSeed),
			baseSeed,
			taskIndex,
			options,
			options.difficulty?.exact ?? 1
		)
	);
}

function allowedTaskClasses(options: RavenGenerationOptions): TaskClass[] {
	const allowed = (
		options.allowedTaskClasses?.length ? options.allowedTaskClasses : DEFAULT_TASK_CLASSES
	).filter((taskClass) => !options.excludedTaskClasses?.includes(taskClass));
	return allowed.length ? allowed : DEFAULT_TASK_CLASSES;
}

function selectTaskClass(rng: Rng, options: RavenGenerationOptions): TaskClass {
	return pick(rng, allowedTaskClasses(options));
}

function selectLevel(rng: Rng, options: RavenGenerationOptions): DifficultyLevel {
	if (options.difficulty?.exact) return options.difficulty.exact;
	const min = options.difficulty?.min ?? 1;
	const max = options.difficulty?.max ?? 3;
	return int(rng, min, max) as DifficultyLevel;
}

function rulesAllowed(task: GeneratedRavenTask, options: RavenGenerationOptions): boolean {
	const families = task.rules.map((r) => r.family);
	if (
		options.allowedRules?.length &&
		!families.some((family) => options.allowedRules?.includes(family))
	)
		return false;
	if (
		options.excludedRules?.length &&
		families.some((family) => options.excludedRules?.includes(family))
	)
		return false;
	return true;
}

function factoryFor(taskClass: TaskClass): TaskFactory {
	if (taskClass === 'attribute_reasoning') return makeAttributeTask;
	if (taskClass === 'quantity_reasoning') return makeQuantityTask;
	if (taskClass === 'spatial_movement') return makeSpatialMovementTask;
	if (taskClass === 'grid_bitmask') return makeGridBitmaskTask;
	if (taskClass === 'logical_set_reasoning') return makeRadialSetTask;
	if (taskClass === 'structural_composition') return makeNestedOverlayTask;
	if (taskClass === 'regional_texture_reasoning') return makeRegionalTextureTask;
	return makeRowColumnFactorizationTask;
}

function finalizeTask(task: DraftTask, meta: BuildMeta): GeneratedRavenTask {
	const difficulty = estimateDifficulty(
		task,
		meta.level,
		meta.variant,
		meta.colorPolicy,
		meta.missingPolicy
	);
	return { ...task, difficulty };
}

function createOptions(
	rng: Rng,
	correctCell: CellSpec,
	distractors: Array<{ cell: CellSpec; family: DistractorFamily }>,
	answerCount = DEFAULT_ANSWER_COUNT
): { options: RavenAnswerOption[]; correctIndex: number; families: DistractorFamily[] } {
	const unique = new Map<string, { cell: CellSpec; family: DistractorFamily }>();
	const correctKey = cellKey(correctCell);
	for (const d of distractors) {
		const key = cellKey(d.cell);
		if (key !== correctKey && !unique.has(key)) unique.set(key, d);
	}

	const selected = [...unique.values()].slice(0, answerCount - 1);
	let guard = 0;
	while (selected.length < answerCount - 1 && guard < 200) {
		const fallback = createFallbackDistractor(rng, correctCell, guard);
		const key = cellKey(fallback.cell);
		if (key !== correctKey && !unique.has(key)) {
			unique.set(key, fallback);
			selected.push(fallback);
		}
		guard += 1;
	}

	const mixed = shuffle(rng, [
		{ cell: cloneCellWithNewIds(correctCell), family: 'correct' as const },
		...selected
	]).slice(0, answerCount);
	const options = mixed.map((item, index) => ({
		id: `answer-${index + 1}`,
		cell: item.cell,
		family: item.family
	}));
	const correctIndex = options.findIndex((item) => item.family === 'correct');
	return { options, correctIndex, families: options.map((option) => option.family) };
}

function createFallbackDistractor(
	rng: Rng,
	source: CellSpec,
	attempt: number
): { cell: CellSpec; family: DistractorFamily } {
	const copy = cloneCellWithNewIds(source);
	const elements = copy.elements;

	const shapeIndex = elements.findIndex((el) => el.type === 'shape');
	if (shapeIndex >= 0) {
		const el = elements[shapeIndex];
		if (el.type === 'shape') {
			if (attempt % 4 === 0) {
				el.shape = pick(
					rng,
					SHAPES.filter((shape) => shape !== el.shape)
				);
				return { cell: copy, family: 'wrong_attribute' };
			}
			if (attempt % 4 === 1) {
				el.size = Math.max(12, Math.min(82, el.size + (attempt % 2 === 0 ? 10 : -10)));
				return { cell: copy, family: 'wrong_step' };
			}
			if (attempt % 4 === 2) {
				el.rotation = ((el.rotation ?? 0) + 45) % 360;
				return { cell: copy, family: 'rotation_error' };
			}
			el.stroke = pick(
				rng,
				Object.values(OBJECT_COLORS).filter((color) => color !== el.stroke)
			);
			return { cell: copy, family: 'wrong_attribute' };
		}
	}

	const dotIndices = elements
		.map((el, index) => (el.type === 'dot' ? index : -1))
		.filter((index) => index >= 0);
	if (dotIndices.length) {
		if (attempt % 3 === 0 && dotIndices.length > 1) {
			elements.splice(dotIndices[dotIndices.length - 1], 1);
			return { cell: copy, family: 'missing_component' };
		}
		if (attempt % 3 === 1) {
			const dot = elements[dotIndices[0]];
			if (dot.type === 'dot') {
				dot.x = Math.max(22, Math.min(78, dot.x + (attempt % 2 === 0 ? 24 : -24)));
				dot.y = Math.max(22, Math.min(78, dot.y + (attempt % 2 === 0 ? -24 : 24)));
			}
			return { cell: copy, family: 'wrong_position' };
		}
		elements.push({
			type: 'dot',
			id: `fallback-dot-${attempt}`,
			x: int(rng, 22, 78),
			y: int(rng, 22, 78),
			r: 4,
			fill: UNIFORM_STROKE
		});
		return { cell: copy, family: 'extra_component' };
	}

	const petalIndices = elements
		.map((el, index) => (el.type === 'petal' ? index : -1))
		.filter((index) => index >= 0);
	if (petalIndices.length) {
		if (attempt % 3 === 0 && petalIndices.length > 1) {
			elements.splice(petalIndices[petalIndices.length - 1], 1);
			return { cell: copy, family: 'missing_component' };
		}
		if (attempt % 3 === 1) {
			const petal = elements[petalIndices[0]];
			if (petal.type === 'petal') petal.angle = (petal.angle + 45) % 360;
			return { cell: copy, family: 'rotation_error' };
		}
		const petal = elements[petalIndices[0]];
		if (petal?.type === 'petal') petal.variant = petal.variant === 'petal' ? 'bar' : 'petal';
		return { cell: copy, family: 'wrong_attribute' };
	}

	const regionIndex = elements.findIndex((el) => el.type === 'region');
	if (regionIndex >= 0) {
		const region = elements[regionIndex];
		if (region.type === 'region') {
			if (attempt % 2 === 0) {
				region.region = pick(
					rng,
					REGIONS.filter((item) => item !== region.region)
				);
				return { cell: copy, family: 'wrong_region' };
			}
			region.texture = pick(
				rng,
				TEXTURES.filter((item) => item !== region.texture)
			);
			return { cell: copy, family: 'wrong_texture' };
		}
	}

	return {
		cell: regionTextureCell(pick(rng, REGIONS), pick(rng, TEXTURES)),
		family: 'wrong_attribute'
	};
}

function cellKey(cell: CellSpec): string {
	return JSON.stringify(cell.elements.map((e) => ({ ...e, id: undefined })));
}

function baseTaskFields(seed: string, taskIndex: number, missingIndex: number) {
	return {
		id: `raven-${taskIndex}-${seed.replace(/[^a-zA-Z0-9]/g, '').slice(-10)}`,
		seed,
		taskIndex,
		generatorVersion: GENERATOR_VERSION,
		taskMode: 'symbolic_matrix' as const,
		matrixSize: '3x3' as const,
		missingIndex
	};
}

function rule(
	id: string,
	family: RuleFamily,
	target: string,
	attribute: string,
	attributeType: RuleSpec['attributeType'],
	axis: RuleSpec['axis'],
	skillTags: string[],
	params?: Record<string, unknown>
): RuleSpec {
	return { id, family, target, attribute, attributeType, axis, skillTags, params };
}

function chooseMissingIndex(rng: Rng, policy: 'bottom_right' | 'random_safe'): number {
	if (policy === 'bottom_right') return 8;
	return pick(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
}

function colorSet(rng: Rng, count = 3): string[] {
	return sample(rng, COLOR_KEYS, count).map((key) => OBJECT_COLORS[key]);
}

function colorFor(
	ruleAxis: 'row' | 'column' | 'position_group',
	colors: string[],
	r: number,
	c: number
): string {
	if (ruleAxis === 'row') return colors[r];
	if (ruleAxis === 'column') return colors[c];
	return colors[(r * 3 + c) % 2];
}

function makeAttributeTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const shape = pick(rng, SIMPLE_SHAPES);
	const secondaryShapes = sample(
		rng,
		SIMPLE_SHAPES.filter((s) => s !== shape),
		3
	);
	const sizes = [28, 40, 54];
	const rotations = [0, 45, 90];
	const colors = colorSet(rng, 3);
	const colorAxis = pick(rng, ['row', 'column'] as const);
	const colorPolicy: ColorPolicy = level === 3 ? 'rule' : 'uniform';
	const missingPolicy = level >= 2 ? 'random_safe' : 'bottom_right';
	const missingIndex = chooseMissingIndex(rng, missingPolicy);
	const cells: CellSpec[] = [];

	for (let r = 0; r < 3; r += 1) {
		for (let c = 0; c < 3; c += 1) {
			const stroke =
				colorPolicy === 'rule' ? colorFor(colorAxis, colors, r, c) : UNIFORM_STROKE;
			const currentShape = level === 3 ? secondaryShapes[r] : shape;
			const size = level === 1 ? sizes[c] : level === 2 ? 42 : sizes[c];
			const rotation = level === 2 ? rotations[c] : undefined;
			cells.push(attributeCell(currentShape, undefined, stroke, { size, rotation }));
		}
	}

	const correct = cloneCellWithNewIds(cells[missingIndex]);
	const r = Math.floor(missingIndex / 3);
	const c = missingIndex % 3;
	const correctStroke =
		colorPolicy === 'rule' ? colorFor(colorAxis, colors, r, c) : UNIFORM_STROKE;
	const correctShape = level === 3 ? secondaryShapes[r] : shape;
	const distractors = [
		{
			cell: attributeCell(correctShape, undefined, correctStroke, {
				size: sizes[(c + 1) % 3],
				rotation: level === 2 ? rotations[c] : undefined
			}),
			family: 'wrong_step' as const
		},
		{
			cell: attributeCell(correctShape, undefined, correctStroke, {
				size: level === 2 ? 42 : sizes[c],
				rotation: level === 2 ? rotations[(c + 1) % 3] : undefined
			}),
			family: 'rotation_error' as const
		},
		{
			cell: attributeCell(
				pick(
					rng,
					SIMPLE_SHAPES.filter((s) => s !== correctShape)
				),
				undefined,
				correctStroke,
				{
					size: level === 2 ? 42 : sizes[c],
					rotation: level === 2 ? rotations[c] : undefined
				}
			),
			family: 'wrong_attribute' as const
		},
		{
			cell: attributeCell(
				correctShape,
				undefined,
				pick(
					rng,
					colorSet(rng, 3).filter((color) => color !== correctStroke) || [UNIFORM_STROKE]
				),
				{
					size: level === 2 ? 42 : sizes[c],
					rotation: level === 2 ? rotations[c] : undefined
				}
			),
			family: 'wrong_attribute' as const
		},
		{
			cell: cloneCellWithNewIds(cells[Math.max(0, missingIndex - 1)]),
			family: 'repetition' as const
		}
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);

	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'attribute_reasoning',
			sceneTopology: 'center',
			componentModel: 'single_object',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules: [
				rule(
					level === 2 ? 'rotation-progression' : 'size-progression',
					'progression',
					'object',
					level === 2 ? 'rotation' : 'size',
					level === 2 ? 'cyclic' : 'ordinal',
					'column',
					['attribute_reasoning']
				),
				...(colorPolicy === 'rule'
					? [
							rule(
								'color-rule',
								'distribution',
								'object',
								'color',
								'nominal',
								colorAxis,
								['color_reasoning']
							)
						]
					: [])
			],
			objectsUsed: [shape, ...secondaryShapes],
			distractorFamilies: answers.families,
			analytics: {
				skillTags: [
					'attribute_reasoning',
					'visual_abstraction',
					...(colorPolicy === 'rule' ? ['color_reasoning'] : [])
				],
				primarySkill: 'attribute_reasoning',
				secondarySkills: ['visual_abstraction']
			},
			explanation:
				level === 2
					? 'В каждой строке меняется поворот фигуры.'
					: 'В каждой строке меняется размер фигуры; на третьем уровне добавляется правило цвета.'
		},
		{
			level,
			variant:
				level === 2
					? 'rotation_progression'
					: level === 3
						? 'size_plus_color'
						: 'size_progression',
			colorPolicy,
			missingPolicy
		}
	);
}

function makeRowColumnFactorizationTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const shapes = sample(rng, SHAPES, 3);
	const contexts = sample(rng, CONTEXTS, 3);
	const colors = colorSet(rng, 3);
	const colorAxis = pick(rng, ['row', 'column'] as const);
	const colorPolicy: ColorPolicy = level === 3 ? 'rule' : 'uniform';
	const missingPolicy = level >= 2 ? 'random_safe' : 'bottom_right';
	const missingIndex = chooseMissingIndex(rng, missingPolicy);
	const cells: CellSpec[] = [];

	for (let r = 0; r < 3; r += 1) {
		for (let c = 0; c < 3; c += 1) {
			const index = r * 3 + c;
			const stroke =
				colorPolicy === 'rule' ? colorFor(colorAxis, colors, r, c) : UNIFORM_STROKE;
			cells.push(
				attributeCell(shapes[r], contexts[c], stroke, {
					parityMarker: level === 2 && index % 2 === 0
				})
			);
		}
	}

	const correct = cloneCellWithNewIds(cells[missingIndex]);
	const r = Math.floor(missingIndex / 3);
	const c = missingIndex % 3;
	const idx = missingIndex;
	const stroke = colorPolicy === 'rule' ? colorFor(colorAxis, colors, r, c) : UNIFORM_STROKE;
	const distractors = [
		{
			cell: attributeCell(shapes[(r + 1) % 3], contexts[c], stroke, {
				parityMarker: level === 2 && idx % 2 === 0
			}),
			family: 'wrong_attribute' as const
		},
		{
			cell: attributeCell(shapes[r], contexts[(c + 1) % 3], stroke, {
				parityMarker: level === 2 && idx % 2 === 0
			}),
			family: 'wrong_layer' as const
		},
		{
			cell: attributeCell(shapes[r], contexts[c], stroke, {
				parityMarker: level === 2 ? idx % 2 !== 0 : false
			}),
			family: 'wrong_position' as const
		},
		{
			cell: attributeCell(
				shapes[r],
				contexts[c],
				pick(rng, colorSet(rng, 3).filter((color) => color !== stroke) || [UNIFORM_STROKE]),
				{ parityMarker: level === 2 && idx % 2 === 0 }
			),
			family: 'wrong_attribute' as const
		},
		{ cell: cloneCellWithNewIds(cells[(missingIndex + 4) % 9]), family: 'repetition' as const }
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);

	const rules = [
		rule('row-shape', 'distribution', 'central_object', 'shape', 'nominal', 'row', [
			'inductive_reasoning',
			'visual_abstraction'
		]),
		rule('column-context', 'distribution', 'outer_context', 'context', 'nominal', 'column', [
			'relational_reasoning'
		])
	];
	if (level === 2)
		rules.push(
			rule(
				'parity-marker',
				'distribution',
				'marker',
				'presence',
				'nominal',
				'position_group',
				['pattern_grouping']
			)
		);
	if (colorPolicy === 'rule')
		rules.push(
			rule('color-rule', 'distribution', 'object', 'color', 'nominal', colorAxis, [
				'color_reasoning'
			])
		);

	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'row_column_factorization',
			sceneTopology: 'center',
			componentModel: 'context_object',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules,
			objectsUsed: [...shapes, ...contexts],
			distractorFamilies: answers.families,
			analytics: {
				skillTags: [
					'inductive_reasoning',
					'visual_abstraction',
					'row_column_factorization',
					...(level === 2 ? ['pattern_grouping'] : []),
					...(colorPolicy === 'rule' ? ['color_reasoning'] : [])
				],
				primarySkill: 'row_column_factorization',
				secondarySkills: ['visual_abstraction', 'selective_attention']
			},
			explanation:
				'Строка задаёт центральную фигуру, столбец — внешний контекст. На более сложных уровнях добавляется группа позиций или цветовое правило.'
		},
		{
			level,
			variant:
				level === 1
					? 'shape_context'
					: level === 2
						? 'shape_context_parity'
						: 'shape_context_color',
			colorPolicy,
			missingPolicy
		}
	);
}

function makeQuantityTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const arithmetic = level === 3 && int(rng, 0, 1) === 1;
	if (arithmetic) return makeQuantityArithmeticTask(rng, seed, taskIndex, options, level);

	const shapes = sample(rng, SIMPLE_SHAPES, 3);
	const counts = level === 1 ? shuffle(rng, [1, 2, 3]) : sample(rng, [3, 4, 5, 6], 3);
	const colors = colorSet(rng, 3);
	const colorAxis = pick(rng, ['row', 'column'] as const);
	const colorPolicy: ColorPolicy = level === 3 ? 'rule' : 'uniform';
	const missingPolicy = level >= 2 ? 'random_safe' : 'bottom_right';
	const missingIndex = chooseMissingIndex(rng, missingPolicy);
	const cells: CellSpec[] = [];

	for (let r = 0; r < 3; r += 1) {
		for (let c = 0; c < 3; c += 1) {
			const stroke =
				colorPolicy === 'rule' ? colorFor(colorAxis, colors, r, c) : UNIFORM_STROKE;
			cells.push(countCell(shapes[r], counts[c], stroke));
		}
	}

	const r = Math.floor(missingIndex / 3);
	const c = missingIndex % 3;
	const stroke = colorPolicy === 'rule' ? colorFor(colorAxis, colors, r, c) : UNIFORM_STROKE;
	const correct = cloneCellWithNewIds(cells[missingIndex]);
	const distractors = [
		{ cell: countCell(shapes[r], counts[(c + 1) % 3], stroke), family: 'wrong_step' as const },
		{
			cell: countCell(shapes[(r + 1) % 3], counts[c], stroke),
			family: 'wrong_attribute' as const
		},
		{
			cell: countCell(shapes[r], Math.max(1, counts[c] - 1), stroke),
			family: 'missing_component' as const
		},
		{
			cell: countCell(shapes[r], Math.min(6, counts[c] + 1), stroke),
			family: 'extra_component' as const
		},
		{
			cell: countCell(
				shapes[r],
				counts[c],
				pick(rng, colorSet(rng, 3).filter((color) => color !== stroke) || [UNIFORM_STROKE])
			),
			family: 'wrong_attribute' as const
		},
		{ cell: cloneCellWithNewIds(cells[(missingIndex + 3) % 9]), family: 'repetition' as const }
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);
	const rules = [
		rule('row-shape', 'distribution', 'object', 'shape', 'nominal', 'row', [
			'visual_abstraction'
		]),
		rule('column-count', 'distribution', 'object_group', 'count', 'numeric', 'column', [
			'quantity_reasoning'
		])
	];
	if (colorPolicy === 'rule')
		rules.push(
			rule('color-rule', 'distribution', 'object', 'color', 'nominal', colorAxis, [
				'color_reasoning'
			])
		);

	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'quantity_reasoning',
			sceneTopology: 'center',
			componentModel: 'single_object',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules,
			objectsUsed: shapes,
			distractorFamilies: answers.families,
			analytics: {
				skillTags: [
					'quantity_reasoning',
					'inductive_reasoning',
					...(colorPolicy === 'rule' ? ['color_reasoning'] : [])
				],
				primarySkill: 'quantity_reasoning',
				secondarySkills: ['visual_abstraction']
			},
			explanation:
				'Строка задаёт тип фигуры, столбец — количество. На третьем уровне может добавляться цветовое правило.'
		},
		{
			level,
			variant: level === 1 ? 'count_1_3' : level === 2 ? 'count_3_6' : 'count_color_rule',
			colorPolicy,
			missingPolicy
		}
	);
}

function makeQuantityArithmeticTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const op = pick(rng, ['addition', 'subtraction'] as const);
	const shapes = sample(rng, SIMPLE_SHAPES, 3);
	const cells: CellSpec[] = [];
	const rows: Array<[number, number, number]> = [];
	for (let r = 0; r < 3; r += 1) {
		let a = int(rng, 1, 4);
		let b = int(rng, 1, 4);
		let res = op === 'addition' ? a + b : a - b;
		let guard = 0;
		while ((res < 1 || res > 6) && guard < 40) {
			a = int(rng, 2, 6);
			b = int(rng, 1, 4);
			res = op === 'addition' ? a + b : a - b;
			guard += 1;
		}
		rows.push([a, b, Math.max(1, Math.min(6, res))]);
		cells.push(
			countCell(shapes[r], rows[r][0], UNIFORM_STROKE),
			countCell(shapes[r], rows[r][1], UNIFORM_STROKE),
			countCell(shapes[r], rows[r][2], UNIFORM_STROKE)
		);
	}
	const missingIndex = 8;
	const correct = cloneCellWithNewIds(cells[8]);
	const [a, b, res] = rows[2];
	const wrongOp = op === 'addition' ? Math.max(1, a - b) : Math.min(6, a + b);
	const distractors = [
		{ cell: countCell(shapes[2], wrongOp, UNIFORM_STROKE), family: 'wrong_operation' as const },
		{
			cell: countCell(shapes[2], Math.max(1, res - 1), UNIFORM_STROKE),
			family: 'missing_component' as const
		},
		{
			cell: countCell(shapes[2], Math.min(6, res + 1), UNIFORM_STROKE),
			family: 'extra_component' as const
		},
		{ cell: countCell(shapes[1], res, UNIFORM_STROKE), family: 'wrong_attribute' as const },
		{ cell: countCell(shapes[2], b, UNIFORM_STROKE), family: 'repetition' as const }
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);
	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'quantity_reasoning',
			sceneTopology: 'center',
			componentModel: 'single_object',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules: [
				rule(
					'row-arithmetic',
					op,
					'object_group',
					'count',
					'numeric',
					'row',
					['quantity_reasoning', 'arithmetic_reasoning'],
					{ operation: op }
				)
			],
			objectsUsed: shapes,
			distractorFamilies: answers.families,
			analytics: {
				skillTags: ['quantity_reasoning', 'arithmetic_reasoning'],
				primarySkill: 'quantity_reasoning',
				secondarySkills: ['arithmetic_reasoning']
			},
			explanation:
				op === 'addition'
					? 'В каждой строке количество в третьей ячейке равно сумме первых двух.'
					: 'В каждой строке количество в третьей ячейке равно разности первых двух.'
		},
		{ level, variant: `count_${op}`, colorPolicy: 'uniform', missingPolicy: 'bottom_right' }
	);
}

function makeSpatialMovementTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const paths: GridSlot[][] =
		level === 1
			? [
					['ml', 'mc', 'mr'],
					['tc', 'mc', 'bc']
				]
			: [
					['tl', 'mc', 'br'],
					['tr', 'mc', 'bl'],
					['tl', 'tc', 'tr'],
					['bl', 'bc', 'br']
				];
	const path = pick(rng, paths);
	const shapes =
		level === 3
			? sample(rng, SIMPLE_SHAPES, 3)
			: [pick(rng, SIMPLE_SHAPES), pick(rng, SIMPLE_SHAPES), pick(rng, SIMPLE_SHAPES)];
	const colors = colorSet(rng, 3);
	const colorPolicy: ColorPolicy = level === 3 ? 'rule' : 'uniform';
	const missingPolicy = level >= 2 ? 'random_safe' : 'bottom_right';
	const missingIndex = chooseMissingIndex(rng, missingPolicy);
	const cells: CellSpec[] = [];
	for (let r = 0; r < 3; r += 1) {
		for (let c = 0; c < 3; c += 1) {
			const stroke = colorPolicy === 'rule' ? colors[r] : UNIFORM_STROKE;
			const shape = level === 3 ? shapes[r] : shapes[0];
			const slot = path[c];
			cells.push(positionCell(shape, slot, stroke, level === 1 ? 27 : 24));
		}
	}
	const r = Math.floor(missingIndex / 3);
	const c = missingIndex % 3;
	const stroke = colorPolicy === 'rule' ? colors[r] : UNIFORM_STROKE;
	const shape = level === 3 ? shapes[r] : shapes[0];
	const correct = cloneCellWithNewIds(cells[missingIndex]);
	const distractors = [
		{ cell: positionCell(shape, path[(c + 1) % 3], stroke), family: 'wrong_position' as const },
		{ cell: positionCell(shape, path[(c + 2) % 3], stroke), family: 'wrong_position' as const },
		{
			cell: positionCell(
				level === 3
					? shapes[(r + 1) % 3]
					: pick(
							rng,
							SIMPLE_SHAPES.filter((s) => s !== shape)
						),
				path[c],
				stroke
			),
			family: 'wrong_attribute' as const
		},
		{
			cell: positionCell(
				shape,
				path[c],
				pick(rng, colors.filter((color) => color !== stroke) || [UNIFORM_STROKE])
			),
			family: 'wrong_attribute' as const
		},
		{ cell: cloneCellWithNewIds(cells[(missingIndex + 1) % 9]), family: 'repetition' as const }
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);
	const rules = [
		rule('movement-path', 'movement', 'object', 'position', 'spatial', 'column', [
			'spatial_reasoning'
		])
	];
	if (level === 3)
		rules.push(
			rule(
				'shape-or-color',
				'distribution',
				'object',
				colorPolicy === 'rule' ? 'color' : 'shape',
				'nominal',
				'row',
				['visual_abstraction']
			)
		);
	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'spatial_movement',
			sceneTopology: level === 1 ? 'center' : 'grid_3x3',
			componentModel: 'position_object',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules,
			objectsUsed: shapes,
			distractorFamilies: answers.families,
			analytics: {
				skillTags: [
					'spatial_reasoning',
					'visual_tracking',
					...(level === 3 ? ['visual_abstraction'] : [])
				],
				primarySkill: 'spatial_reasoning',
				secondarySkills: ['visual_tracking']
			},
			explanation:
				'Положение объекта меняется по заданному пути. На третьем уровне дополнительно меняется цвет или форма.'
		},
		{
			level,
			variant:
				level === 1 ? 'simple_path' : level === 2 ? 'grid_path' : 'path_plus_attribute',
			colorPolicy,
			missingPolicy
		}
	);
}

function makeGridBitmaskTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const op =
		level === 1
			? pick(rng, ['or', 'and'] as const)
			: pick(rng, ['or', 'xor', 'and', 'set_difference'] as const);
	const gridSize: 2 | 3 = level === 1 ? 2 : 3;
	const markerShapes =
		level === 3
			? sample(rng, MARKER_SHAPES, 3)
			: (['circle', 'circle', 'circle'] as ShapeKind[]);
	const colors = colorSet(rng, 3);
	const colorPolicy: ColorPolicy = level === 3 && int(rng, 0, 1) === 1 ? 'rule' : 'uniform';
	const masks: number[] = [];
	const cells: CellSpec[] = [];
	const allowedBits =
		gridSize === 2 ? GRID_2X2_SLOTS.map((slot) => GRID_SLOTS.indexOf(slot)) : undefined;
	for (let r = 0; r < 3; r += 1) {
		const [a, b, result] = validMaskTriple(
			rng,
			op,
			level === 1 ? 1 : 2,
			level === 1 ? 3 : 5,
			gridSize === 2 ? 4 : 9,
			allowedBits
		);
		masks.push(a, b, result);
		const marker = markerShapes[r];
		const stroke = colorPolicy === 'rule' ? colors[r] : UNIFORM_STROKE;
		cells.push(
			markerMaskCell(a, marker, stroke, gridSize),
			markerMaskCell(b, marker, stroke, gridSize),
			markerMaskCell(result, marker, stroke, gridSize)
		);
	}
	const missingIndex = 8;
	const correct = cloneCellWithNewIds(cells[8]);
	const a = masks[6];
	const b = masks[7];
	const raw = masks[8];
	const marker = markerShapes[2];
	const stroke = colorPolicy === 'rule' ? colors[2] : UNIFORM_STROKE;
	const distractors: Array<{ cell: CellSpec; family: DistractorFamily }> = [
		{
			cell: markerMaskCell(nonEmpty(applyMaskOp('or', a, b), 1), marker, stroke, gridSize),
			family: op === 'or' ? 'extra_component' : ('wrong_operation' as const)
		},
		{
			cell: markerMaskCell(nonEmpty(applyMaskOp('xor', a, b), 2), marker, stroke, gridSize),
			family: op === 'xor' ? 'missing_component' : ('wrong_operation' as const)
		},
		{
			cell: markerMaskCell(nonEmpty(applyMaskOp('and', a, b), 4), marker, stroke, gridSize),
			family: op === 'and' ? 'missing_component' : ('wrong_operation' as const)
		},
		{
			cell: markerMaskCell(
				toggleOneBit(raw, rng, gridSize === 2 ? 9 : 9, allowedBits),
				marker,
				stroke,
				gridSize
			),
			family: 'wrong_position' as const
		},
		{
			cell: markerMaskCell(raw, level === 3 ? markerShapes[1] : 'square', stroke, gridSize),
			family: 'wrong_attribute' as const
		},
		{
			cell: markerMaskCell(
				raw,
				marker,
				pick(rng, colors.filter((color) => color !== stroke) || [UNIFORM_STROKE]),
				gridSize
			),
			family: 'wrong_attribute' as const
		}
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);
	const rules = [
		rule(
			'row-set-op',
			op,
			'occupied_slots',
			'grid_mask',
			'set',
			'row',
			['logical_operation', 'spatial_reasoning'],
			{ operation: op, gridSize }
		)
	];
	if (level === 3)
		rules.push(
			rule(
				'marker-rule',
				'distribution',
				'marker',
				colorPolicy === 'rule' ? 'color' : 'shape',
				'nominal',
				'row',
				['visual_abstraction']
			)
		);
	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'grid_bitmask',
			sceneTopology: gridSize === 2 ? 'grid_2x2' : 'grid_3x3',
			componentModel: 'grid_bitmask',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules,
			objectsUsed: [marker, `grid_${gridSize}x${gridSize}`],
			distractorFamilies: answers.families,
			analytics: {
				skillTags: [
					'logical_operation',
					'spatial_bitmask',
					'visual_working_memory',
					...(level === 3 ? ['visual_abstraction'] : [])
				],
				primarySkill: 'logical_operation',
				secondarySkills: ['spatial_reasoning']
			},
			explanation: `В каждой строке третья ячейка получается операцией ${op.toUpperCase()} над занятыми позициями.`
		},
		{
			level,
			variant:
				level === 1
					? 'grid_2x2_basic_set'
					: level === 2
						? 'grid_3x3_set'
						: 'grid_3x3_set_marker_rule',
			colorPolicy,
			missingPolicy: 'bottom_right'
		}
	);
}

function makeRadialSetTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const op = level === 1 ? 'or' : pick(rng, ['or', 'xor', 'set_difference'] as const);
	const directions: 4 | 8 = level === 1 ? 4 : 8;
	const variants =
		level === 3
			? sample(rng, ['petal', 'bar', 'triangle'] as const, 3)
			: [
					pick(rng, ['petal', 'bar', 'triangle'] as const),
					pick(rng, ['petal', 'bar', 'triangle'] as const),
					pick(rng, ['petal', 'bar', 'triangle'] as const)
				];
	const colors = colorSet(rng, 3);
	const colorPolicy: ColorPolicy = level === 3 ? 'rule' : 'uniform';
	const masks: number[] = [];
	const cells: CellSpec[] = [];
	for (let r = 0; r < 3; r += 1) {
		const [a, b, result] = validMaskTriple(
			rng,
			op,
			level === 1 ? 1 : 2,
			level === 1 ? 3 : 4,
			directions
		);
		masks.push(a, b, result);
		const stroke = colorPolicy === 'rule' ? colors[r] : UNIFORM_STROKE;
		const variant = level === 3 ? variants[r] : variants[0];
		cells.push(
			radialCell(a, stroke, variant, directions),
			radialCell(b, stroke, variant, directions),
			radialCell(result, stroke, variant, directions)
		);
	}
	const missingIndex = 8;
	const correct = cloneCellWithNewIds(cells[8]);
	const a = masks[6];
	const b = masks[7];
	const raw = masks[8];
	const stroke = colorPolicy === 'rule' ? colors[2] : UNIFORM_STROKE;
	const variant = level === 3 ? variants[2] : variants[0];
	const distractors: Array<{ cell: CellSpec; family: DistractorFamily }> = [
		{
			cell: radialCell(nonEmpty(applyMaskOp('or', a, b), 1), stroke, variant, directions),
			family: op === 'or' ? 'extra_component' : ('wrong_operation' as const)
		},
		{
			cell: radialCell(nonEmpty(applyMaskOp('xor', a, b), 2), stroke, variant, directions),
			family: op === 'xor' ? 'missing_component' : ('wrong_operation' as const)
		},
		{
			cell: radialCell(
				nonEmpty(applyMaskOp('set_difference', a, b), 4),
				stroke,
				variant,
				directions
			),
			family: op === 'set_difference' ? 'missing_component' : ('wrong_operation' as const)
		},
		{
			cell: radialCell(rotateMask(raw, directions), stroke, variant, directions),
			family: 'rotation_error' as const
		},
		{
			cell: radialCell(toggleOneBit(raw, rng, directions), stroke, variant, directions),
			family: 'extra_component' as const
		},
		{
			cell: radialCell(
				raw,
				stroke,
				level === 3 ? variants[1] : variant === 'petal' ? 'bar' : 'petal',
				directions
			),
			family: 'wrong_attribute' as const
		}
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);
	const rules = [
		rule(
			'radial-set-op',
			op,
			'components',
			'radial_mask',
			'set',
			'row',
			['logical_operation', 'component_reasoning'],
			{ operation: op, directions }
		)
	];
	if (level === 3)
		rules.push(
			rule(
				'component-style-rule',
				'distribution',
				'component',
				colorPolicy === 'rule' ? 'color' : 'style',
				'nominal',
				'row',
				['visual_abstraction']
			)
		);
	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'logical_set_reasoning',
			sceneTopology: 'radial_center',
			componentModel: 'radial_components',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules,
			objectsUsed: [variant, 'radial_mask'],
			distractorFamilies: answers.families,
			analytics: {
				skillTags: ['logical_operation', 'component_reasoning', 'visual_working_memory'],
				primarySkill: 'logical_operation',
				secondarySkills: ['component_reasoning']
			},
			explanation: `В каждой строке компоненты третьей ячейки вычисляются как ${op.toUpperCase()} от первых двух.`
		},
		{
			level,
			variant:
				level === 1
					? 'radial_4_or'
					: level === 2
						? 'radial_8_set'
						: 'radial_8_set_style_color',
			colorPolicy,
			missingPolicy: 'bottom_right'
		}
	);
}

function makeNestedOverlayTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const outers = sample(rng, SIMPLE_SHAPES, 3);
	const inners = sample(
		rng,
		SIMPLE_SHAPES.filter((s) => !outers.includes(s)),
		3
	);
	const relationPool: RelationKind[] =
		level === 1
			? ['separate', 'overlapLeft', 'inside']
			: ['separate', 'overlapLeft', 'overlapRight', 'inside', 'concentric'];
	const relations = sample(rng, relationPool, 3);
	const colors = colorSet(rng, 3);
	const colorPolicy: ColorPolicy = level === 3 ? 'rule' : 'uniform';
	const missingPolicy = level >= 2 ? 'random_safe' : 'bottom_right';
	const missingIndex = chooseMissingIndex(rng, missingPolicy);
	const cells: CellSpec[] = [];
	for (let r = 0; r < 3; r += 1) {
		for (let c = 0; c < 3; c += 1) {
			const outerStroke = colorPolicy === 'rule' ? colors[r] : UNIFORM_STROKE;
			const innerStroke = colorPolicy === 'rule' ? colors[c] : UNIFORM_STROKE;
			cells.push(nestedCell(outers[r], inners[r], relations[c], outerStroke, innerStroke));
		}
	}
	const r = Math.floor(missingIndex / 3);
	const c = missingIndex % 3;
	const outerStroke = colorPolicy === 'rule' ? colors[r] : UNIFORM_STROKE;
	const innerStroke = colorPolicy === 'rule' ? colors[c] : UNIFORM_STROKE;
	const correct = cloneCellWithNewIds(cells[missingIndex]);
	const distractors = [
		{
			cell: nestedCell(
				outers[r],
				inners[r],
				relations[(c + 1) % 3],
				outerStroke,
				innerStroke
			),
			family: 'wrong_layer' as const
		},
		{
			cell: nestedCell(
				outers[(r + 1) % 3],
				inners[r],
				relations[c],
				outerStroke,
				innerStroke
			),
			family: 'wrong_attribute' as const
		},
		{
			cell: nestedCell(
				outers[r],
				inners[(r + 1) % 3],
				relations[c],
				outerStroke,
				innerStroke
			),
			family: 'wrong_attribute' as const
		},
		{
			cell: nestedCell(outers[r], inners[r], relations[c], innerStroke, outerStroke),
			family: 'wrong_layer' as const
		},
		{ cell: cloneCellWithNewIds(cells[(missingIndex + 2) % 9]), family: 'repetition' as const }
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);
	const rules = [
		rule('row-outer-inner', 'distribution', 'objects', 'shape_pair', 'nominal', 'row', [
			'structural_reasoning'
		]),
		rule('column-relation', 'nesting', 'objects', 'relation', 'relation', 'column', [
			'layer_reasoning'
		])
	];
	if (colorPolicy === 'rule')
		rules.push(
			rule('layer-color-rule', 'distribution', 'layer', 'color', 'nominal', 'both', [
				'color_reasoning',
				'layer_reasoning'
			])
		);
	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'structural_composition',
			sceneTopology: 'out_in_center',
			componentModel: 'nested_object',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules,
			objectsUsed: [...outers, ...inners, ...relations],
			distractorFamilies: answers.families,
			analytics: {
				skillTags: [
					'structural_reasoning',
					'layer_reasoning',
					...(colorPolicy === 'rule' ? ['color_reasoning'] : [])
				],
				primarySkill: 'structural_reasoning',
				secondarySkills: ['layer_reasoning']
			},
			explanation:
				'Строка задаёт пару фигур, столбец — отношение между ними. На третьем уровне цвет становится правилом слоёв.'
		},
		{
			level,
			variant:
				level === 1
					? 'basic_relations'
					: level === 2
						? 'expanded_relations_random_missing'
						: 'relations_layer_color',
			colorPolicy,
			missingPolicy
		}
	);
}

function makeRegionalTextureTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	if (level === 2) return makeRegionalOverlayTask(rng, seed, taskIndex, options, level);
	if (level === 3) return makeShapeOverlayTask(rng, seed, taskIndex, options, level);

	const textures = sample(rng, TEXTURES, 3);
	const regions = sample(rng, BASIC_REGIONS, 3);
	const missingPolicy = 'random_safe';
	const missingIndex = chooseMissingIndex(rng, missingPolicy);
	const cells: CellSpec[] = [];
	for (let r = 0; r < 3; r += 1)
		for (let c = 0; c < 3; c += 1) cells.push(regionTextureCell(regions[c], textures[r]));
	const r = Math.floor(missingIndex / 3);
	const c = missingIndex % 3;
	const correct = cloneCellWithNewIds(cells[missingIndex]);
	const distractors = [
		{
			cell: regionTextureCell(regions[(c + 1) % 3], textures[r]),
			family: 'wrong_region' as const
		},
		{
			cell: regionTextureCell(regions[c], textures[(r + 1) % 3]),
			family: 'wrong_texture' as const
		},
		{
			cell: regionTextureCell(regions[(c + 2) % 3], textures[(r + 1) % 3]),
			family: 'wrong_axis' as const
		},
		{ cell: cloneCellWithNewIds(cells[(missingIndex + 1) % 9]), family: 'repetition' as const }
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);
	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'regional_texture_reasoning',
			sceneTopology: 'regional_square',
			componentModel: 'regional_texture',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules: [
				rule('row-texture', 'distribution', 'region', 'texture', 'nominal', 'row', [
					'perceptual_analysis'
				]),
				rule('column-region', 'region_overlay', 'region', 'region', 'regional', 'column', [
					'regional_reasoning'
				])
			],
			objectsUsed: [...textures, ...regions],
			distractorFamilies: answers.families,
			analytics: {
				skillTags: ['regional_reasoning', 'perceptual_analysis'],
				primarySkill: 'regional_reasoning',
				secondarySkills: ['perceptual_analysis']
			},
			explanation: 'Строка задаёт текстуру, столбец — область.'
		},
		{ level, variant: 'region_texture_placement', colorPolicy: 'uniform', missingPolicy }
	);
}

function makeRegionalOverlayTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const verticals = sample(rng, ['leftHalf', 'rightHalf'] as const, 2);
	const horizontals = sample(rng, ['topHalf', 'bottomHalf'] as const, 2);
	const texturesA = sample(rng, PATTERN_TEXTURES, 3);
	const texturesB = sample(
		rng,
		PATTERN_TEXTURES.filter((t) => !texturesA.includes(t)),
		3
	);
	const cells: CellSpec[] = [];
	const rows: Array<{
		a: (typeof verticals)[number];
		b: (typeof horizontals)[number];
		ta: TextureKind;
		tb: TextureKind;
		combined: TextureKind;
	}> = [];
	for (let r = 0; r < 3; r += 1) {
		const a = pick(rng, verticals);
		const b = pick(rng, horizontals);
		const ta = texturesA[r];
		const tb = texturesB[r];
		const combined = combineTextures(ta, tb);
		rows.push({ a, b, ta, tb, combined });
		cells.push(
			overlayRegionCell(a, ta, b, tb, combined, 'a'),
			overlayRegionCell(a, ta, b, tb, combined, 'b'),
			overlayRegionCell(a, ta, b, tb, combined, 'overlay')
		);
	}
	const missingIndex = 8;
	const correct = cloneCellWithNewIds(cells[8]);
	const row = rows[2];
	const distractors = [
		{
			cell: overlayRegionCell(row.a, row.ta, row.b, row.tb, row.ta, 'overlay'),
			family: 'wrong_texture' as const
		},
		{
			cell: overlayRegionCell(row.a, row.ta, row.b, row.tb, row.combined, 'a'),
			family: 'missing_component' as const
		},
		{
			cell: overlayRegionCell(row.a, row.ta, row.b, row.tb, row.combined, 'b'),
			family: 'missing_component' as const
		},
		{
			cell: overlayRegionCell(row.b, row.ta, row.a, row.tb, row.combined, 'overlay'),
			family: 'wrong_region' as const
		},
		{ cell: cloneCellWithNewIds(cells[5]), family: 'repetition' as const }
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);
	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'regional_texture_reasoning',
			sceneTopology: 'regional_square',
			componentModel: 'regional_overlay',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules: [
				rule(
					'region-overlay',
					'overlay',
					'regions',
					'texture_intersection',
					'regional',
					'row',
					['regional_reasoning', 'perceptual_analysis']
				)
			],
			objectsUsed: ['vertical_region', 'horizontal_region', ...texturesA, ...texturesB],
			distractorFamilies: answers.families,
			analytics: {
				skillTags: ['regional_reasoning', 'overlay_reasoning', 'perceptual_analysis'],
				primarySkill: 'regional_reasoning',
				secondarySkills: ['overlay_reasoning']
			},
			explanation:
				'В третьей ячейке накладываются две области. В зоне пересечения появляется комбинированная текстура.'
		},
		{
			level,
			variant: 'rectangular_region_overlay',
			colorPolicy: 'uniform',
			missingPolicy: 'bottom_right'
		}
	);
}

function makeShapeOverlayTask(
	rng: Rng,
	seed: string,
	taskIndex: number,
	options: RavenGenerationOptions,
	level: DifficultyLevel
): GeneratedRavenTask {
	const shapesA = sample(rng, ['circle', 'square', 'diamond', 'triangle'] as ShapeKind[], 3);
	const shapesB = sample(
		rng,
		['circle', 'square', 'diamond', 'triangle', 'pentagon'] as ShapeKind[],
		3
	);
	const texturesA = sample(rng, PATTERN_TEXTURES, 3);
	const texturesB = sample(
		rng,
		PATTERN_TEXTURES.filter((t) => !texturesA.includes(t)),
		3
	);
	const cells: CellSpec[] = [];
	for (let r = 0; r < 3; r += 1) {
		const combined = combineTextures(texturesA[r], texturesB[r]);
		cells.push(
			overlayShapeCell(shapesA[r], texturesA[r], shapesB[r], texturesB[r], combined, 'a'),
			overlayShapeCell(shapesA[r], texturesA[r], shapesB[r], texturesB[r], combined, 'b'),
			overlayShapeCell(
				shapesA[r],
				texturesA[r],
				shapesB[r],
				texturesB[r],
				combined,
				'overlay'
			)
		);
	}
	const missingIndex = 8;
	const correct = cloneCellWithNewIds(cells[8]);
	const combined = combineTextures(texturesA[2], texturesB[2]);
	const distractors = [
		{
			cell: overlayShapeCell(
				shapesA[2],
				texturesA[2],
				shapesB[2],
				texturesB[2],
				texturesA[2],
				'overlay'
			),
			family: 'wrong_texture' as const
		},
		{
			cell: overlayShapeCell(
				shapesA[2],
				texturesA[2],
				shapesB[2],
				texturesB[2],
				combined,
				'a'
			),
			family: 'missing_component' as const
		},
		{
			cell: overlayShapeCell(
				shapesB[2],
				texturesA[2],
				shapesA[2],
				texturesB[2],
				combined,
				'overlay'
			),
			family: 'wrong_region' as const
		},
		{
			cell: overlayShapeCell(
				shapesA[1],
				texturesA[2],
				shapesB[2],
				texturesB[2],
				combined,
				'overlay'
			),
			family: 'wrong_attribute' as const
		},
		{ cell: cloneCellWithNewIds(cells[5]), family: 'repetition' as const }
	];
	const answers = createOptions(
		rng,
		correct,
		distractors,
		options.answerCount ?? DEFAULT_ANSWER_COUNT
	);
	return finalizeTask(
		{
			...baseTaskFields(seed, taskIndex, missingIndex),
			taskClass: 'regional_texture_reasoning',
			sceneTopology: 'regional_square',
			componentModel: 'regional_overlay',
			cells,
			answerOptions: answers.options,
			correctIndex: answers.correctIndex,
			rules: [
				rule(
					'shape-overlay',
					'overlay',
					'figures',
					'intersection_texture',
					'regional',
					'row',
					['regional_reasoning', 'overlay_reasoning']
				)
			],
			objectsUsed: [...shapesA, ...shapesB, ...texturesA, ...texturesB],
			distractorFamilies: answers.families,
			analytics: {
				skillTags: ['regional_reasoning', 'overlay_reasoning', 'perceptual_analysis'],
				primarySkill: 'regional_reasoning',
				secondarySkills: ['overlay_reasoning', 'perceptual_analysis']
			},
			explanation:
				'В третьей ячейке накладываются две текстурированные фигуры; пересечение получает комбинированный рисунок.'
		},
		{
			level,
			variant: 'figure_intersection_overlay',
			colorPolicy: 'uniform',
			missingPolicy: 'bottom_right'
		}
	);
}

function combineTextures(a: TextureKind, b: TextureKind): TextureKind {
	if (a === b) return a;
	if ([a, b].includes('verticalStripes') && [a, b].includes('horizontalStripes'))
		return 'checker';
	if ([a, b].includes('diagonalHatchA') && [a, b].includes('diagonalHatchB')) return 'crossHatch';
	if ([a, b].includes('dotFill')) return 'checker';
	return 'crossHatch';
}

function validMaskTriple(
	rng: Rng,
	op: 'or' | 'xor' | 'and' | 'set_difference',
	minBits: number,
	maxBits: number,
	size: number,
	allowedBits?: number[]
): [number, number, number] {
	for (let guard = 0; guard < 200; guard += 1) {
		const a = randomMask(rng, minBits, maxBits, size, allowedBits);
		const b = randomMask(rng, minBits, maxBits, size, allowedBits);
		const result = applyMaskOp(op, a, b);
		if (result !== 0 && result !== a && result !== b) return [a, b, result];
	}
	const a = randomMask(rng, minBits, maxBits, size, allowedBits);
	const b = randomMask(rng, minBits, maxBits, size, allowedBits);
	const result = nonEmpty(applyMaskOp(op, a, b), allowedBits ? 1 << allowedBits[0] : 1);
	return [a, b, result];
}

function randomMask(
	rng: Rng,
	minBits: number,
	maxBits: number,
	size = 9,
	allowedBits?: number[]
): number {
	const source = allowedBits ?? Array.from({ length: size }, (_, i) => i);
	const bits = sample(rng, source, int(rng, minBits, Math.min(maxBits, source.length)));
	return bits.reduce((mask, bit) => mask | (1 << bit), 0);
}

function applyMaskOp(op: 'or' | 'xor' | 'and' | 'set_difference', a: number, b: number): number {
	if (op === 'or') return a | b;
	if (op === 'xor') return a ^ b;
	if (op === 'and') return a & b;
	return a & ~b;
}

function nonEmpty(mask: number, fallback: number): number {
	return mask || fallback;
}

function toggleOneBit(mask: number, rng: Rng, size = 9, allowedBits?: number[]): number {
	const bit = allowedBits ? pick(rng, allowedBits) : int(rng, 0, size - 1);
	const out = mask ^ (1 << bit);
	return out || 1 << bit;
}

function rotateMask(mask: number, size: 4 | 8 | 9 = 9): number {
	if (size === 4) return ((mask << 1) | (mask >>> 3)) & 0x0f;
	if (size === 8) return ((mask << 1) | (mask >>> 7)) & 0xff;
	const map = [6, 3, 0, 7, 4, 1, 8, 5, 2];
	let out = 0;
	for (let i = 0; i < 9; i += 1) if (mask & (1 << i)) out |= 1 << map[i];
	return out;
}
