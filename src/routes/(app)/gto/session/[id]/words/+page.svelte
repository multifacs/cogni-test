<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let wordInputs = $state<string[]>(Array(data.wordCount).fill(''));
	let isSubmitting = $state(false);
	let showDisclaimer = $state(true);
	let toastMessage = $state<string | null>(null);
	let toastType = $state<'error' | 'success' | 'info'>('info');

	async function submitWords() {
		isSubmitting = true;

		const response = await fetch(`/gto/session/${data.sessionId}/words`, {
			method: 'POST',
			body: JSON.stringify({
				words: wordInputs.map((w) =>
					w
						.toLowerCase()
						.replace(/ё/g, 'е')
				)
			}),
			headers: { 'Content-Type': 'application/json' }
		});

		if (response.ok) {
			goto('/gto');
		} else {
			const err = await response.json();
			toastMessage = err.error || 'Ошибка отправки';
			toastType = 'error';
		}
		isSubmitting = false;
	}
</script>

<section class="banner">
	<h1 class="text-2xl font-bold">Последовательность слов</h1>
	<p class="text-gray-400">{data.sessionName}</p>
</section>

<main class="main flex flex-col items-center justify-center gap-4">
	<div class="flex w-full max-w-xs flex-col gap-3">
		{#each wordInputs as _, i}
			<div class="flex flex-col gap-1">
				<label for="word-{i}" class="text-sm text-gray-400"
					>{i + 1}-е слово</label
				>
				<input
					id="word-{i}"
					type="text"
					bind:value={wordInputs[i]}
					class="rounded-lg bg-gray-800 px-3 py-2 text-white outline-none ring-1 ring-gray-600 focus:ring-blue-500"
					placeholder="Введите слово"
				/>
			</div>
		{/each}

		<Button color="green" onclick={submitWords} disabled={isSubmitting || wordInputs.some((w) => !w.trim())}>
			{isSubmitting ? 'Отправка...' : 'Отправить'}
		</Button>
	</div>
</main>

<section class="low-content flex items-center justify-center">
	<Button color="red" goto="/gto">Выйти</Button>
</section>

{#if showDisclaimer}
	<Modal bind:showModal={showDisclaimer}>
		{#snippet header()}
			<h2 class="text-2xl text-white">Внимание!</h2>
		{/snippet}
		<div class="flex flex-col gap-4">
			<p class="text-white">
				Отправить слова можно только один раз. Второй попытки не будет. Убедитесь, что вы готовы.
			</p>
			<Button color="green" onclick={() => (showDisclaimer = false)}>Понятно</Button>
		</div>
	</Modal>
{/if}

{#if toastMessage}
	<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = null)} />
{/if}
