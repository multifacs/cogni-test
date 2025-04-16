<script lang="ts">
	import ResultsChart from '$lib/components/charts/ResultsChart.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { TestResultMap } from '$lib/tests/types.js';
	import { formatUserLocalDate } from '$lib/utils/index.js';

	const { data } = $props();
	const slug = data.slug;
	const results = data.results;
	console.log(slug, results);

	// Открытый элемент (по умолчанию первый)
	let openedSessionId = $state(results[0]?.sessionId);

	// Переключаем открытие/закрытие
	const toggleSession = (sessionId: string) => {
		openedSessionId = (openedSessionId === sessionId ? null : sessionId) as string;
	};
</script>

{#if results.length == 0}
	<h1>Попыток нет</h1>
{/if}
<div
	class="test-container
rounded-2xl
flex
max-h-[75dvh]
w-full
flex-col
items-center
gap-4
overflow-y-scroll
bg-gray-700
"
>
	{#each results as result}
		<div class="rounded-2xl w-full bg-gray-600 shadow">
			<button
				class="rounded-t-2xl flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-400"
				onclick={() => toggleSession(result.sessionId)}
			>
				<span class="font-medium text-gray-50">
					{openedSessionId === result.sessionId
						? 'Попытка от ' + formatUserLocalDate(result.createdAt)
						: formatUserLocalDate(result.createdAt)}
				</span>
				<svg
					class={`h-5 w-5 transform text-gray-500 transition-transform ${
						openedSessionId === result.sessionId ? 'rotate-180' : ''
					}`}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			{#if openedSessionId === result.sessionId}
				<div class="w-full border-t px-4 pt-2 pb-4">
					<ResultsChart
						testType={slug as keyof TestResultMap}
						results={result.attempts}
						xtitle="Попытки"
						ytitle="Время (мс)"
					/>
				</div>
			{/if}
		</div>
	{/each}
</div>

<div class="controls flex items-center justify-center gap-2.5">
	<Button color="blue" goto={`/tests/${slug}`}>В начало</Button>
	<Button color="red" goto="/tests">К тестам</Button>
</div>

<style>
	.test-container {
		scrollbar-width: none;
	}
</style>
