<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import StepTimer from './StepTimer.svelte';

	let {
		pairIndex,
		total,
		phrase,
		deadline,
		now,
		error = null,
		value = '',
		onInput,
		onSubmit
	}: {
		pairIndex: number;
		total: number;
		phrase: string;
		deadline: number;
		now: number;
		error?: string | null;
		value?: string;
		onInput: (value: string) => void;
		onSubmit: () => void;
	} = $props();
</script>

<div class="flex w-full flex-col items-center gap-4 sm:gap-6">
	<StepTimer {deadline} {now} />

	<h2 class="text-center text-lg text-[var(--main-text-color)] sm:text-2xl">
		Сочетание {pairIndex} из {total}
	</h2>

	<p
		data-testid="memorize-phrase"
		class="text-center text-2xl font-bold tracking-wide text-[var(--main-text-color)] sm:text-4xl"
	>
		{phrase}
	</p>

	<form
		class="flex w-full flex-col items-center gap-3 sm:gap-4"
		onsubmit={(e) => {
			e.preventDefault();
			onSubmit();
		}}
	>
		<label class="text-sm text-[var(--main-text-color)] sm:text-base" for="association-input">
			Придумайте ассоциацию к сочетанию
		</label>
		<input
			id="association-input"
			class="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center text-lg text-white placeholder:text-white/50 focus:ring-2 focus:ring-white/40 focus:outline-hidden sm:text-xl"
			type="text"
			autocomplete="off"
			autofocus
			placeholder="Например: образ, картинка, ситуация…"
			{value}
			oninput={(e) => onInput(e.currentTarget.value)}
		/>
		{#if error}
			<p class="text-sm text-red-400 sm:text-base">{error}</p>
		{/if}
		<Button color="green" type="submit">Дальше</Button>
	</form>
</div>
