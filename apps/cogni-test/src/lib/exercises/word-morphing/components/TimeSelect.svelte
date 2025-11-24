<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import TextInput from '$lib/components/ui/login-form/TextInput.svelte';

	import { formatTime } from '../logic';

	let {
		timeOptions,
		selectedTimeOption,
		selectTime,
		customTimeInput = $bindable(),
		handleCustomTimeChange,
		customTimeInSeconds,
		confirmCustomTime
	} = $props();
</script>

<h2>Выберите время на запоминание:</h2>
<div class="grid max-w-lg grid-cols-2 gap-4">
	{#each timeOptions as timeOption}
		<Button
			color={selectedTimeOption === timeOption ? 'blue' : 'gray'}
			onclick={() => selectTime(timeOption)}
		>
			{timeOption.name}
		</Button>
	{/each}
</div>

{#if selectedTimeOption.name === 'Пользовательский'}
	<div
		class="mt-4 flex flex-col items-center gap-2 rounded-lg p-4"
	>
		<label for="customTime">Введите время в минутах:</label>
		<div class="flex items-center gap-2">
			<TextInput
				plain
				name="customTime"
				bind:value={customTimeInput}
				type="number"
				min="0.5"
				step="0.5"
				onchange={handleCustomTimeChange}
			/>
			<span>мин.</span>
		</div>
		<p class="mt-1 text-sm text-gray-500">
			{customTimeInSeconds} секунд ({formatTime(customTimeInSeconds)})
		</p>
		<Button color="green" onclick={confirmCustomTime}>Подтвердить</Button>
	</div>
{/if}
