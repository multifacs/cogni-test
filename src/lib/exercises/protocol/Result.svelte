<script lang="ts">
	import type { ProtocolTrial } from './types';
	import { isProtocolType } from './config';
	import { summarize } from './summary';

	let {
		results,
		exerciseType,
		meta
	}: {
		results: ProtocolTrial[];
		exerciseType: string;
		meta?: Record<string, unknown>;
	} = $props();

	const summary = $derived(isProtocolType(exerciseType) ? summarize(exerciseType, results) : {});
	const labels: Record<string, string> = {
		N: 'Предъявлений',
		accuracy: 'Точность',
		mean_time: 'Среднее время верных ответов',
		timeout_N: 'Нет ответа',
		correct_N: 'Верных ответов',
		max_level: 'Максимальный предъявленный уровень',
		max_correct_level: 'Максимальный верно выполненный уровень',
		mean_response_time: 'Среднее время ответа',
		total_reproduction_ms: 'Общее время воспроизведения',
		numbers_completed: 'Использовано клеток',
		targets_solved: 'Подобрано сумм',
		boards_completed: 'Пройдено матриц',
		mean_target_time: 'Среднее время подбора суммы',
		overshoot_N: 'Превышений суммы',
		total_found: 'Найдено вхождений',
		precision: 'Точность выделения',
		mean_find_time: 'Средний интервал поиска',
		full_board_N: 'Полностью найдено матриц',
		real_accuracy: 'Точность настоящих слов',
		pseudo_accuracy: 'Точность псевдослов',
		balanced_accuracy: 'Сбалансированная точность',
		min_correct_delta: 'Минимальное верное различие',
		min_correct_gap: 'Минимальная верная разность расстояний',
		reaction_ms: 'Время реакции',
		valid_result: 'Зачётное нажатие'
	};

	function label(key: string): string {
		if (labels[key]) return labels[key];
		if (/^accuracy_[123]$/.test(key)) return `Точность на уровне ${key.at(-1)}`;
		if (/^mean_time_[123]$/.test(key)) return `Среднее время на уровне ${key.at(-1)}`;
		if (/^recall_[123]$/.test(key)) return `Полнота поиска на уровне ${key.at(-1)}`;
		if (key.startsWith('accuracy_')) {
			const family: Record<string, string> = {
				red: 'красный',
				yellow: 'жёлтый',
				green: 'зелёный',
				blue: 'синий',
				white: 'белый',
				black: 'чёрный'
			};
			return `Точность: ${family[key.slice(9)] ?? key.slice(9)}`;
		}
		return key;
	}

	function format(key: string, value: number | null): string {
		if (value === null) return '—';
		if (key.includes('accuracy') || key === 'precision' || key.startsWith('recall_')) {
			return `${(value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
		}
		if (key === 'valid_result') return value ? 'Да' : 'Нет';
		const formatted = value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
		return key.includes('time') || key.endsWith('_ms') ? `${formatted} мс` : formatted;
	}
</script>

<div class="w-full space-y-4 p-2 sm:p-4">
	{#if exerciseType === 'lexical_decision'}<p
			class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
		>
			Используется временный словарь и непроверенные псевдослова. Результат сохраняется для
			тренировки и не включается в профиль.
		</p>{/if}
	{#if meta?.end_reason === 'technical_error'}<p
			role="status"
			class="rounded-lg bg-amber-50 p-3 text-amber-900"
		>
			Тест завершён из-за технической ошибки. Сохранена доступная история.
		</p>
	{:else if meta?.end_reason === 'aborted' || meta?.completed === 'false'}
		<p role="status" class="rounded-lg bg-amber-50 p-3 text-amber-900">
			Тест прерван. Сохранены только предъявленные задания.
		</p>
	{/if}
	{#if exerciseType === 'motor_button' && results[0]?.is_false_start}
		<p class="text-center text-xl font-semibold">Фальстарт</p>
	{:else if exerciseType === 'motor_button' && results[0]?.is_timeout}
		<p class="text-center text-xl font-semibold">Нет ответа</p>
	{/if}
	<dl class="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
		{#each Object.entries(summary) as [key, value] (key)}
			<div class="rounded-xl bg-[#364b6c] p-3 text-center text-white">
				<dt class="text-xs opacity-80 sm:text-sm">{label(key)}</dt>
				<dd class="mt-1 text-lg font-semibold sm:text-xl">{format(key, value)}</dd>
			</div>
		{/each}
	</dl>
	{#if results.length > 0}
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead
					><tr
						><th class="p-2">№</th><th class="p-2">Уровень</th><th class="p-2"
							>Результат</th
						><th class="p-2">Время</th></tr
					></thead
				>
				<tbody>
					{#each results as trial (trial.trial_index)}
						<tr class="border-t border-gray-200">
							<td class="p-2">{trial.trial_index}</td>
							<td class="p-2"
								>{trial.stimulus.level ?? trial.difficulty_level ?? '—'}</td
							>
							<td class="p-2"
								>{trial.is_timeout
									? 'Нет ответа'
									: trial.is_correct
										? 'Верно'
										: 'Не выполнено'}</td
							>
							<td class="p-2">{format('response_time_ms', trial.response_time_ms)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
