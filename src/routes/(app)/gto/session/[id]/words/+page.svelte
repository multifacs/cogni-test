<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { computeRemainingMs } from '$lib/gto/words-cooldown';

	let { data } = $props();

	let wordInputs = $state<string[]>([]);
	$effect(() => {
		// сброс при переходе между сессиями — компонент переиспользуется
		const wordCount = data.wordCount;
		wordInputs = Array(wordCount).fill('');
	});
	let isSubmitting = $state(false);
	let showDisclaimer = $state(true);
	let toastMessage = $state<string | null>(null);
	let toastType = $state<'error' | 'success' | 'info'>('info');

	// ─── Cooldown before word input (long-term memory check) ───────────

	let nowMs = $state(Date.now());

	$effect(() => {
		// lastResultAt — реактивная зависимость: при переходе между сессиями
		// (компонент переиспользуется) эффект перезапускается с новым интервалом
		const lastResultAt = data.lastResultAt;

		const interval = setInterval(() => {
			nowMs = Date.now();
			if (computeRemainingMs(lastResultAt, nowMs) <= 0) {
				clearInterval(interval);
			}
		}, 1000);

		return () => clearInterval(interval);
	});

	const secondsRemaining = $derived(
		Math.ceil(computeRemainingMs(data.lastResultAt, nowMs) / 1000)
	);
	const cooldownMinutes = $derived(Math.ceil(secondsRemaining / 60));
	const cooldownMinutesLabel = $derived(
		cooldownMinutes === 1 ? 'минуту' : [2, 3, 4].includes(cooldownMinutes) ? 'минуты' : 'минут'
	);
	const countdownLabel = $derived(
		`${String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:${String(secondsRemaining % 60).padStart(2, '0')}`
	);

	async function submitWords() {
		isSubmitting = true;

		const response = await fetch(`/gto/session/${data.sessionId}/words`, {
			method: 'POST',
			body: JSON.stringify({
				words: wordInputs.map((w) => w.toLowerCase().replace(/ё/g, 'е'))
			}),
			headers: { 'Content-Type': 'application/json' }
		});

		if (response.ok) {
			goto(resolve('/gto'), { invalidateAll: true });
		} else {
			const err = await response.json();
			toastMessage = err.error || 'Ошибка отправки';
			toastType = 'error';
		}
		isSubmitting = false;
	}
</script>

<section class="banner">
	<h1 class="text-center text-2xl font-bold">Последовательность слов</h1>
	<p class="text-gray-400">{data.sessionName}</p>
	{#if !data.hasWordSet}
		<p class="text-sm text-yellow-400">
			Сет слов ещё не назначен — введите слова, и результат будет посчитан после назначения
		</p>
	{/if}
</section>

<main class="main flex flex-col items-center justify-center gap-4">
	{#if secondsRemaining > 0}
		<!-- Ожидание перед вводом слов — проверка долгосрочной памяти -->
		<div
			class="flex w-full max-w-xs flex-col items-center gap-4 rounded-xl bg-gray-800 px-6 py-8 ring-1 ring-gray-600"
		>
			<p class="text-6xl font-bold text-white tabular-nums sm:text-7xl">{countdownLabel}</p>
			<p class="text-center text-sm text-gray-400">
				Отдохните от тестов и займитесь другими делами — слова можно будет ввести через
				{cooldownMinutes}
				{cooldownMinutesLabel}, чтобы проверить долгосрочную память
			</p>
		</div>
	{:else}
		<div class="flex w-full max-w-xs flex-col gap-3">
			{#each Array.from({ length: wordInputs.length }, (_, i) => i) as i (i)}
				<div class="flex flex-col gap-1">
					<label for="word-{i}" class="text-sm text-gray-400">{i + 1}-е слово</label>
					<input
						id="word-{i}"
						type="text"
						bind:value={wordInputs[i]}
						class="rounded-lg bg-gray-800 px-3 py-2 text-white ring-1 ring-gray-600 outline-none focus:ring-blue-500"
						placeholder="Введите слово"
					/>
				</div>
			{/each}

			<Button
				color="green"
				onclick={submitWords}
				disabled={isSubmitting || wordInputs.some((w) => !w.trim())}
			>
				{isSubmitting ? 'Отправка...' : 'Отправить'}
			</Button>
		</div>
	{/if}
</main>

<section class="low-content flex items-center justify-center">
	<Button color="red" goto="/gto" invalidateAll>Выйти</Button>
</section>

{#if showDisclaimer}
	<Modal bind:showModal={showDisclaimer}>
		{#snippet header()}
			<h2 class="text-center text-2xl text-white">Внимание!</h2>
		{/snippet}
		<div class="flex flex-col gap-4">
			<p class="text-white">
				Пройдите тест на долгосрочную память в самом конце исследования. Отправить слова
				можно только один раз. Второй попытки не будет. Убедитесь, что вы готовы.
			</p>
			<Button color="green" onclick={() => (showDisclaimer = false)}>Понятно</Button>
		</div>
	</Modal>
{/if}

{#if toastMessage}
	<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = null)} />
{/if}
