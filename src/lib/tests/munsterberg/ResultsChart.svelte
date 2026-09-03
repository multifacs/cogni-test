<script lang="ts">
	import type { TestResultMap } from '../types';
	import type { MunsterbergResult } from './types';

	let {
		testType,
		results,
		meta
	}: {
		testType: 'munsterberg';
		results: MunsterbergResult[];
		meta: string[];
	} = $props();

	const time = $derived(
		results.filter((x) => !x.guessed).length === 0
			? Math.round(results.reduce((a, b) => a + b.time, 0) / 1000)
			: 60
	);
</script>

<div class="flex flex-col items-center">
	<p><b>Время прохождения:</b> {time} с</p>
	<p><b>Отгадано слов:</b> {results.filter((x) => x.guessed).length}/{results.length}</p>

	{#each results as result}
		<p>
			<b>{result.word}</b>:
			<span class={result.guessed ? 'text-green-400' : 'text-red-500'}>
				{result.guessed ? 'отгадано' : 'не отгадано'}
			</span>
			{result.guessed ? `за ${result.time} мс` : ''}
		</p>
	{/each}
</div>
