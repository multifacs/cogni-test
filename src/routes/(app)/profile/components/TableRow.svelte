<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		value = $bindable(),
		type = 'value',
		options = [],
		isBoolean = false,
		min,
		max,
		form,
		span,
		omit,
		children
	}: {
		label: string;
		value?: any;
		type?: 'input' | 'value' | 'choice' | 'range' | 'custom-choice' | 'custom';
		options?: { label: string; value: string }[];
		isBoolean?: boolean;
		min?: number;
		max?: number;
		form?: string;
		span?: boolean;
		omit?: boolean;
		children?: Snippet;
	} = $props();

	// Парсинг входной строки в массив объектов
	function parseInputToRows(input: any): { text: string; choice: string }[] {
		if (type !== 'custom-choice') return [];

		if (Array.isArray(input)) {
			if (input.length === 0) return [{ text: '', choice: options[0]?.value ?? '' }];
			return input;
		}

		if (typeof input !== 'string' || !input.trim()) {
			return [{ text: '', choice: options[0]?.value ?? '' }];
		}

		const parts = input
			.split(',')
			.map((p) => p.trim())
			.filter((p) => p);
		const hasChoices = parts.some((part) => part.includes(':'));

		if (hasChoices) {
			return parts.map((part) => {
				const [text, choice] = part.split(':').map((s) => s.trim());
				return { text: text || '', choice: choice || options[0]?.value || '' };
			});
		} else {
			return parts.map((text) => ({
				text: text,
				choice: ''
			}));
		}
	}

	function rowsToString(rows: { text: string; choice: string }[]): string {
		if (type !== 'custom-choice') return '';

		const filledRows = rows.filter((row) => row.text.trim());

		if (filledRows.length === 0) return '';

		const hasAnyChoice = filledRows.some((row) => row.choice);

		if (hasAnyChoice) {
			return filledRows.map((row) => `${row.text}: ${row.choice}`).join(', ');
		} else {
			return filledRows.map((row) => row.text).join(', ');
		}
	}

	// Флаг для предотвращения циклических обновлений
	let isInternalUpdate = $state(false);

	// Инициализация rows из value
	let rows = $state(ensureTrailingEmptyRow(parseInputToRows(value)));

	// Синхронизация с внешним value (только если обновление не изнутри)
	$effect(() => {
		if (type !== 'custom-choice') return;

		if (isInternalUpdate) return;

		const parsed = ensureTrailingEmptyRow(parseInputToRows(value));

		if (JSON.stringify(parsed) !== JSON.stringify(rows)) {
			rows = parsed;
		}
	});

	function ensureTrailingEmptyRow(rows: { text: string; choice: string }[] | undefined) {
		if (type !== 'custom-choice') return;

		if (!rows) return [{ text: '', choice: options[0]?.value ?? '' }];

		const last = rows[rows.length - 1];

		if (!last || last.text.trim() !== '') {
			return [...rows, { text: '', choice: options[0]?.value ?? '' }];
		}

		return rows;
	}

	function updateText(index: number, newText: string) {
		if (type !== 'custom-choice') return;

		isInternalUpdate = true;
		const newRows = (rows ?? []).map((row, i) =>
			i === index ? { ...row, text: newText } : row
		);

		rows = ensureTrailingEmptyRow(newRows);
		queueMicrotask(() => {
			isInternalUpdate = false;
		});
	}

	function updateChoice(index: number, newChoice: string) {
		if (type !== 'custom-choice') return;

		isInternalUpdate = true;
		const newRows = (rows ?? []).map((row, i) =>
			i === index ? { ...row, choice: newChoice } : row
		);

		rows = ensureTrailingEmptyRow(newRows);
		queueMicrotask(() => {
			isInternalUpdate = false;
		});
	}

	function removeRow(index: number) {
		if (type !== 'custom-choice') return;

		isInternalUpdate = true;
		rows = (rows ?? []).filter((_, i) => i !== index);

		if (!rows || rows.length === 0) {
			rows = [{ text: '', choice: options[0]?.value ?? '' }];
		}
		queueMicrotask(() => {
			isInternalUpdate = false;
		});
	}

	// Обновляем value при изменении rows
	$effect(() => {
		if (type !== 'custom-choice') return;
		const stringValue = rowsToString(rows ?? []);

		if (value !== stringValue) {
			isInternalUpdate = true;
			value = stringValue;

			// microtask, а не setTimeout — быстрее и чище
			queueMicrotask(() => {
				isInternalUpdate = false;
			});
		}
	});

	const showSelect = $derived(options.length > 0);

	const baseInputClasses =
		'w-full rounded-lg border bg-gray-700 text-gray-100 px-3 py-2 text-sm transition-colors duration-200 outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500';

	const selectClasses =
		'w-full cursor-pointer rounded-lg border bg-gray-700 border-gray-600 text-gray-100 px-3 py-2 text-sm appearance-none transition-colors duration-200 outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500';

	const numberClasses =
		'flex-1 rounded-lg border bg-gray-700 border-gray-600 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500';
</script>

{#if span}
	<!-- Section header row -->
	<div class="bg-gray-800/50 px-4 py-2">
		<span class="font-semibold text-gray-300 text-sm">{label}</span>
	</div>
{:else}
	<div
		class="flex flex-col gap-1 border-b border-gray-700 p-3 transition-colors duration-200 last:border-b-0 md:flex-row md:items-center md:gap-4"
	>
		<div
			class="flex shrink-0 items-start text-sm text-gray-300 md:w-1/3 {omit
				? 'md:sr-only'
				: ''}"
		>
			{label}
		</div>

		<div class="flex-1 text-sm text-gray-100">
			{#if type === 'input'}
				<input
					type="text"
					bind:value
					class="{baseInputClasses} border-gray-600"
					placeholder="Введите..."
					{form}
				/>
			{:else if type === 'value'}
				<span class="text-sm text-gray-100">{value}</span>
			{:else if type === 'choice'}
				{#if isBoolean}
					<select
						bind:value
						class={selectClasses}
						class:border-amber-500={value == null}
						class:focus:ring-amber-500={value == null}
						class:focus:border-amber-500={value == null}
					>
						<option value={null} disabled selected hidden class="text-gray-500">
							Выберите вариант...
						</option>
						<option value={false}>Нет</option>
						<option value={true}>Да</option>
					</select>
				{:else}
					<select
						bind:value
						class={selectClasses}
						class:border-amber-500={value == null}
						class:focus:ring-amber-500={value == null}
						class:focus:border-amber-500={value == null}
					>
						<option value={null} disabled selected hidden class="text-gray-500">
							Выберите вариант...
						</option>
						{#each options as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				{/if}
			{:else if type === 'range'}
				<div class="flex w-full items-center gap-3">
					<input
						type="number"
						bind:value
						{min}
						{max}
						class={numberClasses}
						class:border-amber-500={value == null}
						placeholder="Введите..."
					/>
					<span class="text-xs text-gray-400 shrink-0">
						{min} – {max}
					</span>
				</div>
			{:else if type === 'custom-choice'}
				<div class="flex w-full flex-col gap-2">
					{#each rows ?? [] as row, i}
						<div class="flex items-center gap-2">
							<input
								type="text"
								value={row.text}
								oninput={(e) => updateText(i, e.currentTarget.value)}
								class="{numberClasses} border-gray-600"
								class:flex-1={showSelect}
								class:w-full={!showSelect}
								placeholder="Введите текст..."
							/>

							{#if showSelect}
								<select
									value={row.choice}
									onchange={(e) => updateChoice(i, e.currentTarget.value)}
									class="flex-1 {selectClasses}"
								>
									<option value="">(без выбора)</option>
									{#each options as opt}
										<option value={opt.value}>{opt.label}</option>
									{/each}
								</select>
							{/if}

							{#if row.text.trim() !== ''}
								<button
									type="button"
									onclick={() => removeRow(i)}
									class="cursor-pointer font-bold text-red-400 transition-colors duration-200 hover:text-red-300 shrink-0"
								>
									✕
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{:else if type === 'custom'}
				{#if children}
					{@render children()}
				{:else}
					<span class="text-sm text-gray-100">{value}</span>
				{/if}
			{/if}
		</div>
	</div>
{/if}
