<script lang="ts">
	// import ResultsChart from '$lib/components/charts/ResultsChart.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { TestResultMap } from '$lib/tests/types.js';
	import { formatUserLocalDate } from '$lib/utils/index.js';
	import { onMount, type SvelteComponent } from 'svelte';

	const { data } = $props();
	const slug = data.slug;
	const results = data.results;
	console.log(slug, results);

	let Component: typeof SvelteComponent | null = $state(null);

	onMount(async () => {
		let customResultsChart;
		try {
			customResultsChart = (await import(`$lib/tests/${slug}/ResultsChart.svelte`)).default;
			Component = customResultsChart;
		} catch (err) {
			console.log(err);
		}
		if (Component) return;
		const resultsChart = (await import(`$lib/components/charts/ResultsChart.svelte`)).default;
		Component = resultsChart;
	});

	// Открытый элемент (по умолчанию первый)
	let openedSessionId = $state(results[0]?.sessionId);

	// Переключаем открытие/закрытие
	const toggleSession = (sessionId: string) => {
		openedSessionId = (openedSessionId === sessionId ? null : sessionId) as string;
	};
</script>

{#if results.length == 0}
	<h1>Попыток нет</h1>
{:else}
	<div
		class="test-container flex min-h-0 w-full max-w-2xl flex-col items-center gap-4 overflow-y-scroll rounded-2xl bg-gray-700 p-2"
	>
		{#each results as result}
			<div class="w-full rounded-2xl bg-gray-600 shadow">
				<button
					class={`flex w-full cursor-pointer items-center justify-between rounded-t-2xl px-4 py-3 transition-colors hover:bg-gray-400 ${openedSessionId != result.sessionId ? 'hover:rounded-b-2xl' : ''}`}
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

				{#if openedSessionId === result.sessionId && Component}
					<div class="box-border flex flex-col items-center border-t p-2">
						<Component
							testType={slug as keyof TestResultMap}
							results={result.attempts}
							meta={'meta' in result ? result['meta'] : undefined}
						/>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<div class="controls flex items-center justify-center gap-2.5">
	<Button color="blue" goto={`/tests/${slug}`}>Заново</Button>
	<Button color="red" goto="/tests">К тестам</Button>
</div>

<style>
	.test-container {
		scrollbar-width: none;
	}
</style>
