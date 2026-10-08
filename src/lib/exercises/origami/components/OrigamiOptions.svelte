<script lang="ts">
	import type { OrigamiOption } from '../types';

	let {
		options,
		correctIndex,
		selectedIndex,
		isLocked,
		onselect
	}: {
		options: OrigamiOption[];
		correctIndex: number;
		selectedIndex: number | null;
		isLocked: boolean;
		onselect: (index: number) => void;
	} = $props();

	function tileClass(index: number): string {
		const base =
			'flex items-center justify-center rounded-xl border bg-linear-to-br from-white to-slate-50 p-1.5 shadow-sm transition-all';
		if (!isLocked || selectedIndex === null) {
			return `${base} border-slate-300/40 hover:border-blue-400 hover:shadow-md`;
		}
		if (index === correctIndex) {
			return `${base} border-emerald-400 ring-2 ring-emerald-300`;
		}
		if (index === selectedIndex) {
			return `${base} border-red-400 ring-2 ring-red-300`;
		}
		return `${base} border-slate-300/40 opacity-60`;
	}
</script>

<div class="grid grid-cols-2 gap-2 sm:gap-3">
	{#each options as option, index (index)}
		<button
			type="button"
			class={tileClass(index)}
			aria-label="Вариант {index + 1}"
			disabled={isLocked && selectedIndex !== null}
			onclick={() => onselect(index)}
		>
			<svg viewBox="-5 -5 110 110" class="h-full w-full max-w-40">
				<rect
					x="0"
					y="0"
					width="100"
					height="100"
					fill="#ffffff"
					stroke="#94a3b8"
					stroke-width="1.5"
				/>
				{#each option.holes as hole, i (i)}
					<circle cx={hole.x} cy={hole.y} r="3.5" fill="#1e293b" />
				{/each}
			</svg>
		</button>
	{/each}
</div>
