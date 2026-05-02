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
		children
	}: {
		label: string;
		value?: any;
		type?: 'input' | 'value' | 'choice' | 'range' | 'custom-choice' | 'custom';
		options?: { label: string; value: string }[];
		isBoolean?: boolean;
		min?: number;
		max?: number;
		children?: Snippet;
	} = $props();

	// Инициализация для custom-choice
	if (type === 'custom-choice' && (!value || value.length === 0)) {
		value = [{ text: '', choice: options[0]?.value ?? '' }];
	}

	function addRow() {
		value = [...value, { text: '', choice: options[0]?.value ?? '' }];
	}

	function removeRow(index: number) {
		value = value.filter((_: any, i: number) => i !== index);
	}
</script>

<tr
	class="transition-colors odd:bg-blue-50 even:bg-blue-100 hover:bg-blue-200 max-md:flex max-md:flex-col max-md:items-start"
>
	<td
		class="max-w-[50%] px-6 py-4 max-md:py-2 text-sm font-medium whitespace-break-spaces text-blue-900 max-md:max-w-full"
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
					<option value="false">Нет</option>
					<option value="true">Да</option>
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
				{#each value as row, i}
					<div class="flex items-center gap-2 max-md:flex-col max-md:items-start">
						<input
							type="text"
							bind:value={row.text}
							class="rounded-sm border border-blue-300 bg-white px-2 py-1 text-blue-900
							outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
							placeholder="Текст"
						/>

						<div class="flex gap-2">
							<select
								bind:value={row.choice}
								class="rounded-sm border border-blue-300 bg-white px-2 py-1 text-blue-900
							outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
							>
								{#each options as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>

							<button
								type="button"
								onclick={() => removeRow(i)}
								class="cursor-pointer font-bold text-red-500 hover:text-red-600"
							>
								✕
							</button>
						</div>
					</div>
				{/each}

				<button
					type="button"
					onclick={addRow}
					class="cursor-pointer self-start rounded-sm bg-blue-500 px-3 py-1 text-white
					transition hover:bg-blue-600 active:bg-blue-700"
				>
					+
				</button>
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
