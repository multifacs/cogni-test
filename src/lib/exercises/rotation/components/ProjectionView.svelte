<script lang="ts">
	import { orthographicProjections } from '../logic/projection';
	import type { RotationStructure } from '../types';

	let {
		structure,
		view
	}: {
		structure: RotationStructure;
		view: 'front' | 'right';
	} = $props();

	const CELL = 10;
	const STROKE = 0.8;

	/** Rows top-to-bottom = layers top-to-bottom (z = layers−1 … 0). */
	const rows = $derived(orthographicProjections(structure)[view].reverse());
	const width = $derived(structure.size * CELL);
	const height = $derived(structure.layers * CELL);
</script>

<svg
	viewBox={`0 0 ${width} ${height}`}
	class="h-auto w-full"
	role="img"
	aria-label={view === 'front' ? 'Вид спереди' : 'Вид справа'}
>
	{#each rows as row, r (r)}
		{#each row as shape, c (c)}
			{#if shape === 'cube'}
				<rect
					x={c * CELL + 1}
					y={r * CELL + 1}
					width={CELL - 2}
					height={CELL - 2}
					rx="1.5"
					fill="#818cf8"
					stroke="#4338ca"
					stroke-width={STROKE}
				/>
			{:else if shape === 'sphere'}
				<circle
					cx={c * CELL + CELL / 2}
					cy={r * CELL + CELL / 2}
					r={CELL / 2 - 1.2}
					fill="#fbbf24"
					stroke="#b45309"
					stroke-width={STROKE}
				/>
			{:else}
				<rect
					x={c * CELL + 1}
					y={r * CELL + 1}
					width={CELL - 2}
					height={CELL - 2}
					rx="1.5"
					fill="none"
					stroke="#cbd5e1"
					stroke-width={STROKE}
				/>
			{/if}
		{/each}
	{/each}
</svg>
