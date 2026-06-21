<script lang="ts">
	import type { GeneratedRavenTask } from './types';
	import RavenCell from './RavenCell.svelte';

	let {
		task,
		selectedIndex,
		isLocked,
		onselect
	}: {
		task: GeneratedRavenTask;
		selectedIndex: number | null;
		isLocked: boolean;
		onselect: (index: number) => void;
	} = $props();
</script>

<div class="grid w-full grid-cols-3 gap-1.5 sm:gap-2">
	{#each task.answerOptions as option, index (option.id)}
		<button
			type="button"
			class="selected:border-slate-700 correct:border-green-500 correct:bg-green-50 wrong:border-red-400 wrong:bg-red-50 relative min-w-0 cursor-pointer rounded-xl border-2 border-transparent bg-white/85 p-1 shadow-sm transition-all duration-100 ease-out hover:-translate-y-0.5 hover:border-slate-400 disabled:pointer-events-none"
			class:selected={selectedIndex === index}
			class:correct={selectedIndex !== null && index === task.correctIndex}
			class:wrong={selectedIndex === index && index !== task.correctIndex}
			disabled={isLocked}
			onclick={() => onselect(index)}
			aria-label={`Вариант ${index + 1}`}
		>
			<span
				class="absolute top-1 left-1 z-1 grid size-5 place-items-center rounded-full bg-slate-700/90 text-xs font-extrabold text-white"
				>{index + 1}</span
			>
			<RavenCell cell={option.cell} cellId={`${task.id}-answer-${index}`} compact />
		</button>
	{/each}
</div>
