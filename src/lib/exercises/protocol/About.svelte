<script lang="ts">
	import { page } from '$app/state';
	import { definitions, isProtocolType } from './config';

	const definition = $derived(
		isProtocolType(page.params.slug ?? '')
			? definitions[page.params.slug as keyof typeof definitions]
			: null
	);
</script>

{#if definition}
	<div class="space-y-4">
		<h2 class="text-xl font-semibold">{definition.title}</h2>
		<p>{definition.instructions}</p>
		{#if page.params.slug === 'lexical_decision'}<p
				class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
			>
				Используется временный словарь и непроверенные псевдослова. Результат сохраняется
				для тренировки и не включается в профиль.
			</p>{/if}
		<p class="text-sm opacity-75">
			Выполняйте задание до появления результатов. Кнопка «Завершить тест» сохраняет
			незавершённую попытку. «Пройти ещё раз» начинает отдельную сессию.
		</p>
	</div>
{/if}
