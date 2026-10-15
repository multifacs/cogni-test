<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import StepTimer from './StepTimer.svelte';

	let {
		index,
		total,
		association,
		deadline,
		now,
		value = '',
		onInput,
		onSubmit
	}: {
		index: number;
		total: number;
		association: string;
		deadline: number;
		now: number;
		value?: string;
		onInput: (value: string) => void;
		onSubmit: () => void;
	} = $props();
</script>

<div class="flex w-full flex-col items-center gap-4 sm:gap-6">
	<StepTimer {deadline} {now} />

	<h2 class="text-center text-lg text-[var(--main-text-color)] sm:text-2xl">
		Ассоциация {index} из {total}
	</h2>

	<p
		data-testid="recall-association"
		class="text-center text-2xl font-bold tracking-wide text-[var(--main-text-color)] sm:text-4xl"
	>
		{association}
	</p>

	<form
		class="flex w-full flex-col items-center gap-3 sm:gap-4"
		onsubmit={(e) => {
			e.preventDefault();
			onSubmit();
		}}
	>
		<label class="text-sm text-[var(--main-text-color)] sm:text-base" for="recall-input">
			Запишите сочетание, которое вы запомнили с этой ассоциацией
		</label>
		<input
			id="recall-input"
			class="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center text-lg text-white placeholder:text-white/50 focus:ring-2 focus:ring-white/40 focus:outline-hidden sm:text-xl"
			type="text"
			autocomplete="off"
			autofocus
			placeholder="например: ба-ко-ми ло-те-су"
			{value}
			oninput={(e) => onInput(e.currentTarget.value)}
		/>
		<p class="text-xs text-[var(--main-text-color)] opacity-70 sm:text-sm">
			Формат не важен: дефисы, пробелы и регистр не учитываются.
		</p>
		<Button color="green" type="submit">Ответить</Button>
	</form>
</div>
