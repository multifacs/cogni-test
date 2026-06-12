<script lang="ts">
	import type { Color, Shape } from '../types';

	let {
		recalledCombos,
		expectedCombos,
		category,
		originalShape,
		originalColor,
		currentShape,
		currentColor
	}: {
		recalledCombos: any;
		expectedCombos: any;
		category: 'words' | 'shapes';
		originalShape: Shape;
		originalColor: Color;
		currentShape: Shape;
		currentColor: Color;
	} = $props();

	// Функция для проверки совпадения комбинаций
	function isCorrectCombination(recalled: string, expected: string) {
		// замена на случаи зеленый/зелёный
		return (
			recalled.toLocaleLowerCase().replace('ё', 'е') ===
			expected.toLocaleLowerCase().replace('ё', 'е')
		);
	}
</script>

<div class="flex flex-col gap-2">
	<h2>Ваши ответы:</h2>
	<ol>
		{#each recalledCombos as recalled, i}
			<li
				class="text-center"
				style="color: {isCorrectCombination(recalled, expectedCombos[i])
					? 'var(--color-green-500)'
					: 'var(--color-red-400)'}"
			>
				{recalled || '(не введено)'}
			</li>
		{/each}
	</ol>
</div>

<div class="flex flex-col gap-2">
	<h2>Ожидаемые ответы:</h2>
	{#if category === 'words'}
		<ul>
			{#each expectedCombos as expected}
				<li class="text-center">{expected}</li>
			{/each}
		</ul>
	{:else}
		<div class="flex items-center gap-4">
			<div class="flex flex-col items-center mb-2">
				<svg class="shape-svg" viewBox="0 0 100 100" width="80" height="80">
					{@html originalShape.render(originalColor.value)}
				</svg>
				<span>{originalShape.name} {originalColor.name}</span>
			</div>
			<div class="flex flex-col items-center mb-2">
				<svg class="shape-svg" viewBox="0 0 100 100" width="80" height="80">
					{@html currentShape.render(originalColor.value)}
				</svg>
				<span>{currentShape.name} {originalColor.name}</span>
			</div>
			<div class="flex flex-col items-center mb-2">
				<svg class="shape-svg" viewBox="0 0 100 100" width="80" height="80">
					{@html currentShape.render(currentColor.value)}
				</svg>
				<span>{currentShape.name} {currentColor.name}</span>
			</div>
		</div>
	{/if}
</div>
