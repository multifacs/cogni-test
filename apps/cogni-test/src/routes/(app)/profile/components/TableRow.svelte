<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		value = $bindable(),
		type = 'value',
		options = [], // для select
		isBoolean = false, // для checkbox (да/нет)
		min,
		max,
		form,
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

	function ensureTrailingEmptyRow(rows: { text: string; choice: string }[]) {
		if (type !== 'custom-choice') return;

		const last = rows[rows.length - 1];

		if (!last || last.text.trim() !== '') {
			return [...rows, { text: '', choice: options[0]?.value ?? '' }];
		}

		return rows;
	}

	function updateText(index: number, newText: string) {
		if (type !== 'custom-choice') return;

		isInternalUpdate = true;
		let newRows = rows.map((row, i) => (i === index ? { ...row, text: newText } : row));

		rows = ensureTrailingEmptyRow(newRows);
		queueMicrotask(() => {
			isInternalUpdate = false;
		});
	}

	function updateChoice(index: number, newChoice: string) {
		if (type !== 'custom-choice') return;

		isInternalUpdate = true;
		let newRows = rows.map((row, i) => (i === index ? { ...row, choice: newChoice } : row));

		rows = ensureTrailingEmptyRow(newRows);
		queueMicrotask(() => {
			isInternalUpdate = false;
		});
	}

	function removeRow(index: number) {
		if (type !== 'custom-choice') return;

		isInternalUpdate = true;
		rows = rows.filter((_, i) => i !== index);

		if (rows.length === 0) {
			rows = [{ text: '', choice: options[0]?.value ?? '' }];
		}
		queueMicrotask(() => {
			isInternalUpdate = false;
		});
	}

	// Обновляем value при изменении rows
	$effect(() => {
		if (type !== 'custom-choice') return;
		const stringValue = rowsToString(rows);

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
</script>

<tr
	class="transition-colors odd:bg-blue-50 even:bg-blue-100 hover:bg-blue-200 max-md:flex max-md:flex-col max-md:items-start"
>
	<td
		class="max-w-[50%] px-6 py-4 text-sm font-medium whitespace-break-spaces text-blue-900 max-md:max-w-full max-md:py-2"
	>
		{label}
	</td>

	<td class="max-w-[50%] px-6 py-4 text-sm text-blue-900 max-md:max-w-full">
		{#if type === 'input'}
			<input
				type="text"
				bind:value
				class="w-full rounded-sm border border-blue-300 bg-white px-3 py-2 text-blue-900
				placeholder-blue-400
				transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
				placeholder="Введите..."
				{form}
			/>
		{:else if type === 'value'}
			{value}
		{:else if type === 'choice'}
			{#if isBoolean}
				<select
					bind:value
					class="w-full rounded-sm border border-blue-300 bg-white px-3 py-2 text-blue-900
					transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
				>
					<option value={false}>Нет</option>
					<option value={true}>Да</option>
				</select>
			{:else}
				<select
					bind:value
					class="w-full truncate rounded-sm border border-blue-300 bg-white px-3 py-2
					text-blue-900 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
				>
					{#each options as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			{/if}
		{:else if type === 'range'}
			<div class="flex items-center gap-2">
				<input
					type="number"
					bind:value
					{min}
					{max}
					class="w-24 rounded-sm border border-blue-300 bg-white px-2 py-1 text-blue-900
					outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
				/>
				<span class="text-xs text-blue-500">
					{min} – {max}
				</span>
			</div>
		{:else if type === 'custom-choice'}
			<div class="flex flex-col gap-2">
				{#each rows as row, i}
					<div class="flex items-center gap-2 max-md:flex-col max-md:items-start">
						<input
							type="text"
							value={row.text}
							oninput={(e) => updateText(i, e.currentTarget.value)}
							class="rounded-sm border border-blue-300 bg-white px-2 py-1 text-blue-900
							outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
							placeholder="Текст"
						/>

						<div class="flex gap-2">
							{#if showSelect}
								<select
									value={row.choice}
									onchange={(e) => updateChoice(i, e.currentTarget.value)}
									class="rounded-sm border border-blue-300 bg-white px-2 py-1 text-blue-900
									outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
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
									class="cursor-pointer font-bold text-red-500 hover:text-red-600"
								>
									✕
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else if type === 'custom'}
			{#if children}
				{@render children()}
			{:else}
				{value}
			{/if}
		{/if}
	</td>
</tr>
