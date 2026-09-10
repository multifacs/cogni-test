<script lang="ts">
	import { saveFieldDebounced, saveFieldNow } from './autosave';
	import Autocomplete from './components/Autocomplete.svelte';
	import CustomChoice from './components/CustomChoice.svelte';
	import type { Question } from './flows';

	let {
		question,
		value = $bindable()
	}: {
		question: Question;
		value: string | number | boolean | null | undefined;
	} = $props();

	const debouncedKinds = new Set(['input', 'range', 'autocomplete', 'custom-choice']);
	const isDebounced = $derived(debouncedKinds.has(question.type.kind));

	const rangeType = $derived(question.type.kind === 'range' ? question.type : null);
	const choiceType = $derived(question.type.kind === 'choice' ? question.type : null);
	const customChoiceType = $derived(
		question.type.kind === 'custom-choice' ? question.type : null
	);

	const numericValue = $derived(typeof value === 'number' ? value : Number(value ?? 0) || 0);

	let initialized = $state(false);

	$effect(() => {
		if (!initialized) {
			initialized = true;
			return;
		}
		if (isDebounced) saveFieldDebounced(question.key);
		else saveFieldNow(question.key);
	});
</script>

<div class="flex flex-col gap-5">
	<h3 class="text-lg max-sm:text-base">{question.label}</h3>

	{#if question.type.kind === 'input'}
		<input
			class="w-full rounded-xl px-4 py-3 transition-all outline-none"
			style="
				background-color: #ffffff;
				border: 2px solid var(--input-bg-color);
				color: var(--main-text-color);
			"
			placeholder={question.type.placeholder ?? ''}
			bind:value
			onfocus={(e) => {
				e.currentTarget.style.borderColor = 'var(--main-accent-color)';
				e.currentTarget.style.boxShadow = '0 0 0 4px var(--input-bg-color)';
			}}
			onblur={(e) => {
				e.currentTarget.style.borderColor = 'var(--input-bg-color)';
				e.currentTarget.style.boxShadow = 'none';
			}}
		/>
	{:else if rangeType}
		<div class="flex items-center justify-center gap-6">
			<button
				type="button"
				aria-label="Уменьшить"
				disabled={numericValue <= rangeType.min}
				onclick={() => (value = Math.max(rangeType.min, numericValue - 1))}
				class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
				style="
					background-color: #ffffff;
					border: 2px solid var(--input-bg-color);
					color: var(--main-text-color);
				"
			>
				−
			</button>

			<div class="flex min-w-[7rem] flex-col items-center">
				<input
					type="number"
					min={rangeType.min}
					max={rangeType.max}
					bind:value
					inputmode="numeric"
					class="w-full [appearance:textfield] rounded-2xl py-3 text-center text-4xl font-bold transition-all outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					style="
						background-color: #ffffff;
						border: 2px solid var(--input-bg-color);
						color: var(--main-text-color);
					"
				/>
			</div>

			<button
				type="button"
				aria-label="Увеличить"
				disabled={numericValue >= rangeType.max}
				onclick={() => (value = Math.min(rangeType.max, numericValue + 1))}
				class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
				style="
					background-color: #ffffff;
					border: 2px solid var(--input-bg-color);
					color: var(--main-text-color);
				"
			>
				+
			</button>
		</div>
	{:else if choiceType}
		<div class="flex flex-col gap-3">
			{#each choiceType.options as opt (opt.value)}
				<label
					class="group flex h-15 cursor-pointer items-center gap-3 rounded-xl p-4 transition-all"
					style="
							border: 2px solid {value === opt.value ? 'var(--button-green)' : 'var(--input-bg-color)'};
							background-color: {value === opt.value
						? 'color-mix(in srgb, var(--button-green) 30%, white)'
						: '#ffffff'};
						"
				>
					<input
						type="radio"
						name={question.key}
						value={opt.value}
						bind:group={value}
						class="peer sr-only"
					/>
					<span
						class="ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all"
						style="
							border-color: {value === opt.value ? 'var(--button-green)' : 'var(--input-bg-color)'};
							background-color: {value === opt.value ? 'var(--button-green)' : '#ffffff'};
						"
					>
						{#if value === opt.value}
							<span class="h-2 w-2 rounded-full bg-white"></span>
						{/if}
					</span>
					<span
						class="text-sm"
						style="
							color: var(--main-text-color);
							font-weight: {value === opt.value ? '600' : '400'};
						"
					>
						{opt.label}
					</span>
				</label>
			{/each}
		</div>
	{:else if question.type.kind === 'boolean'}
		<div class="flex gap-3">
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded-xl p-4 text-sm font-medium transition-all"
				style="
					border: 2px solid {value === true ? 'var(--button-green)' : 'var(--input-bg-color)'};
					background-color: {value === true ? 'var(--button-green)' : '#ffffff'};
					color: {value === true ? 'var(--button-green-text)' : 'var(--main-text-color)'};
				"
				onclick={() => (value = true)}
			>
				Да
			</button>

			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded-xl p-4 text-sm font-medium transition-all"
				style="
					border: 2px solid {value === false ? 'var(--button-red)' : 'var(--input-bg-color)'};
					background-color: {value === false ? 'var(--button-red)' : '#ffffff'};
					color: {value === false ? 'var(--button-red-text)' : 'var(--main-text-color)'};
				"
				onclick={() => (value = false)}
			>
				Нет
			</button>
		</div>
	{:else if question.type.kind === 'autocomplete'}
		<Autocomplete bind:query={value as any} />
	{:else if customChoiceType}
		<CustomChoice bind:value={value as any} options={customChoiceType.options ?? []} />
	{/if}
</div>
