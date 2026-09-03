<script lang="ts">
	import type { MunsterbergResult } from './types';

	let { results }: { results: MunsterbergResult[] } = $props();

	const time = $derived(
		results.filter((x) => !x.guessed).length === 0
			? Math.round(results.reduce((a, b) => a + b.time, 0) / 1000)
			: 60
	);
</script>

<div class="flex flex-col items-center">
	<p><b>Время прохождения:</b> {time} с</p>
	<p><b>Отгадано слов:</b> {results.filter((x) => x.guessed).length}/{results.length}</p>

	{#each results as result (result.attempt)}
		<p>
			<b>{result.word}</b>:
			<span class={result.guessed ? 'text-green-400' : 'text-red-500'}>
				{result.guessed ? 'отгадано' : 'не отгадано'}
			</span>
			{result.guessed ? `за ${result.time} мс` : ''}
		</p>
	{/each}
</div>
