import type { SkillMetric } from '$lib/types';
export const protocolTypes = [
	'verbal_classification',
	'anti_munsterberg',
	'lexical_decision',
	'sum_matrix',
	'memory_matrix',
	'color_lightness',
	'color_saturation',
	'color_distance',
	'motor_button'
] as const;
export type ProtocolType = (typeof protocolTypes)[number];
export function isProtocolType(value: string): value is ProtocolType {
	return (protocolTypes as readonly string[]).includes(value);
}
type Definition = {
	title: string;
	instructions: string;
	skills: SkillMetric[];
	count: number;
	deadline: number;
};
export const definitions: Record<ProtocolType, Definition> = {
	verbal_classification: {
		title: 'Классификация',
		instructions:
			'Что объединяет три слова? Введите общий признак. Всего 10 вопросов, до минуты на каждый.',
		skills: ['verbal_function', 'thinking', 'attention'],
		count: 10,
		deadline: 60000
	},
	anti_munsterberg: {
		title: 'АнтиМюнстерберг',
		instructions:
			'Найдите все вхождения указанного слова. Выберите первую и последнюю клетку прямого пути. На каждой из 6 матриц — минута; поиск можно закончить досрочно.',
		skills: ['attention', 'verbal_function'],
		count: 6,
		deadline: 60000
	},
	lexical_decision: {
		title: 'Лексическое решение',
		instructions:
			'Решите, является ли строка настоящим русским словом. 10 предъявлений, 5 секунд на каждое.',
		skills: ['verbal_function', 'reaction_speed', 'attention'],
		count: 10,
		deadline: 5000
	},
	sum_matrix: {
		title: 'Матрица суммы',
		instructions:
			'Выбирайте цифры, сумма которых равна цели. Подходит любая комбинация. Решённые клетки блокируются. За минуту используйте как можно больше клеток.',
		skills: ['thinking', 'attention', 'working_memory'],
		count: 1,
		deadline: 60000
	},
	memory_matrix: {
		title: 'Матрица памяти',
		instructions:
			'Запомните подсвеченные клетки за 2 секунды и выберите их после исчезновения узора. 10 заданий; ошибка сохраняет уровень. На ответ — 30 секунд.',
		skills: ['short_memory', 'spacial_perception', 'attention'],
		count: 10,
		deadline: 30000
	},
	color_lightness: {
		title: 'Какой цвет светлее',
		instructions: 'Выберите более светлый цвет. 10 пар, до 10 секунд на ответ.',
		skills: ['color_perception', 'attention'],
		count: 10,
		deadline: 10000
	},
	color_saturation: {
		title: 'Какой цвет насыщеннее',
		instructions: 'Выберите более насыщенный цвет. 10 пар, до 10 секунд на ответ.',
		skills: ['color_perception', 'attention'],
		count: 10,
		deadline: 10000
	},
	color_distance: {
		title: 'Какой цвет ближе к эталону',
		instructions:
			'Сравните два цвета с показанным эталоном и выберите ближайший. 10 пар, до 10 секунд на ответ.',
		skills: ['color_perception', 'attention'],
		count: 10,
		deadline: 10000
	},
	motor_button: {
		title: 'Электронная кнопочка',
		instructions:
			'Дождитесь зелёного индикатора и сразу нажмите кнопку под ним. Раннее нажатие — фальстарт. В запуске одна реакция.',
		skills: ['reaction_speed', 'attention'],
		count: 1,
		deadline: 5000
	}
};
export const protocolConfig = {
	protocol_version: '1',
	generator_version: '1',
	show_ms: 2000,
	success_ms: 300,
	error_ms: 1000,
	memory_response_ms: 30000,
	wait_min_ms: 2000,
	wait_max_ms: 5000,
	role: 'diagnostic',
	hue_steps: [40, 35, 30, 25, 20, 16, 12, 9, 6, 3],
	epsilon: 1e-6
} as const;
