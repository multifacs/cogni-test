<script lang="ts">
	type CustomChoiceRow = { text: string; choice: string };

	let {
		value = $bindable(),
		options = []
	}: {
		value?: string | CustomChoiceRow[] | null;
		options?: { label: string; value: string }[];
	} = $props();

	function parseInputToRows(
		input: string | CustomChoiceRow[] | null | undefined
	): CustomChoiceRow[] {
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
		}
		return parts.map((text) => ({ text, choice: '' }));
	}

	function rowsToString(rows: CustomChoiceRow[]): string {
		const filled = rows.filter((row) => row.text.trim());
		if (filled.length === 0) return '';

		const hasAnyChoice = filled.some((row) => row.choice);
		if (hasAnyChoice) {
			return filled.map((row) => `${row.text}: ${row.choice}`).join(', ');
		}
		return filled.map((row) => row.text).join(', ');
	}

	function ensureTrailingEmptyRow(rows: CustomChoiceRow[]) {
		const last = rows[rows.length - 1];
		if (!last || last.text.trim() !== '') {
			return [...rows, { text: '', choice: options[0]?.value ?? '' }];
		}
		return rows;
	}

	let isInternalUpdate = $state(false);
	let rows = $state(ensureTrailingEmptyRow(parseInputToRows(value)));

	$effect(() => {
		if (isInternalUpdate) return;
		const parsed = ensureTrailingEmptyRow(parseInputToRows(value));
		if (JSON.stringify(parsed) !== JSON.stringify(rows)) {
			rows = parsed;
		}
	});

	$effect(() => {
		const stringValue = rowsToString(rows);
		if (value !== stringValue) {
			isInternalUpdate = true;
			value = stringValue;
			queueMicrotask(() => {
				isInternalUpdate = false;
			});
		}
	});

	function updateText(index: number, newText: string) {
		isInternalUpdate = true;
		rows = ensureTrailingEmptyRow(
			rows.map((row, i) => (i === index ? { ...row, text: newText } : row))
		);
		queueMicrotask(() => {
			isInternalUpdate = false;
		});
	}

	function updateChoice(index: number, newChoice: string) {
		isInternalUpdate = true;
		rows = ensureTrailingEmptyRow(
			rows.map((row, i) => (i === index ? { ...row, choice: newChoice } : row))
		);
		queueMicrotask(() => {
			isInternalUpdate = false;
		});
	}

	function removeRow(index: number) {
		isInternalUpdate = true;
		rows = rows.filter((_, i) => i !== index);
		if (rows.length === 0) {
			rows = [{ text: '', choice: options[0]?.value ?? '' }];
		}
		queueMicrotask(() => {
			isInternalUpdate = false;
		});
	}

	const showSelect = $derived(options.length > 0);
</script>

<div class="flex w-full flex-col gap-2">
	{#each rows as row, i (i)}
		<div class="flex flex-wrap items-center gap-2">
			<input
				type="text"
				value={row.text}
				oninput={(e) => updateText(i, e.currentTarget.value)}
				class="w-full rounded-xl px-4 py-3 transition-all outline-none"
				class:flex-1={showSelect}
				class:w-full={!showSelect}
				style="
				background-color: #ffffff;
				border: 2px solid var(--input-bg-color);
				color: var(--main-text-color);
			"
				placeholder="Введите текст..."
				onfocus={(e) => {
					e.currentTarget.style.borderColor = 'var(--main-accent-color)';
					e.currentTarget.style.boxShadow = '0 0 0 4px var(--input-bg-color)';
				}}
				onblur={(e) => {
					e.currentTarget.style.borderColor = 'var(--input-bg-color)';
					e.currentTarget.style.boxShadow = 'none';
				}}
			/>

			{#if showSelect}
				<select
					value={row.choice}
					onchange={(e) => updateChoice(i, e.currentTarget.value)}
					class="w-full flex-1 rounded-xl px-4 py-3 transition-all outline-none"
					style="
					background-color: #ffffff;
					border: 2px solid var(--input-bg-color);
					color: var(--main-text-color);
				"
					onfocus={(e) => {
						e.currentTarget.style.borderColor = 'var(--main-accent-color)';
						e.currentTarget.style.boxShadow = '0 0 0 4px var(--input-bg-color)';
					}}
					onblur={(e) => {
						e.currentTarget.style.borderColor = 'var(--input-bg-color)';
						e.currentTarget.style.boxShadow = 'none';
					}}
				>
					<option value="">(без выбора)</option>
					{#each options as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			{/if}

			{#if row.text.trim() !== ''}
				<button
					type="button"
					onclick={() => removeRow(i)}
					class="cursor-pointer font-bold text-red-500 transition-colors hover:text-red-600"
				>
					✕
				</button>
			{/if}
		</div>
	{/each}
</div>
