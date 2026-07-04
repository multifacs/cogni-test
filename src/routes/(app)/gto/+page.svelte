<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	let { data } = $props();

	let showDisclaimer = $state(false);
	let disclaimerType = $state<'tests' | 'words'>('tests');
	let selectedSessionId = $state('');

	function showTestDisclaimer(sessionId: string) {
		selectedSessionId = sessionId;
		disclaimerType = 'tests';
		showDisclaimer = true;
	}

	function showWordsDisclaimer(sessionId: string) {
		selectedSessionId = sessionId;
		disclaimerType = 'words';
		showDisclaimer = true;
	}

	function confirmAction() {
		showDisclaimer = false;
		if (disclaimerType === 'tests') {
			window.location.href = `/gto/session/${selectedSessionId}/play`;
		} else {
			window.location.href = `/gto/session/${selectedSessionId}/words`;
		}
	}
</script>

<section class="banner">
	<h1 class="text-3xl font-bold">Сессия ГТО-М</h1>
</section>

<main class="main flex flex-col items-center justify-center gap-4">
	{#if data.activeSessions.length === 0}
		<p class="text-center text-lg">У вас нет активных сессий ГТО-М</p>
	{:else}
		<div class="flex w-full max-w-xs flex-col gap-4">
			{#each data.activeSessions as session}
				<div class="rounded-lg bg-gray-800 p-4">
					<h2 class="mb-3 text-xl font-semibold">{session.name}</h2>
					{#if !session.hasCompletedTests}
						<Button color="blue" onclick={() => showTestDisclaimer(session.gtoSessionId)}
							>Начать тестирование</Button
						>
					{:else if !session.hasSubmittedWords}
						<Button color="yellow" onclick={() => showWordsDisclaimer(session.gtoSessionId)}
							>Заполнить последовательность слов</Button
						>
					{:else}
						<p class="text-gray-400"
							>Вы завершили электронную часть. Ожидайте результатов.</p
						>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</main>

<section class="low-content flex items-center justify-center">
	<p class="max-w-md text-center text-lg max-md:text-sm"
		>Пройдите все тесты и заполните последовательность слов для завершения сессии.</p
	>
</section>

{#if showDisclaimer}
	<Modal bind:showModal={showDisclaimer}>
		{#snippet header()}
			<h2 class="text-2xl text-white">
				{#if disclaimerType === 'tests'}
					Начать тестирование?
				{:else}
					Заполнить последовательность слов?
				{/if}
			</h2>
		{/snippet}
		<div class="flex flex-col gap-4">
			<p class="text-white">
				{#if disclaimerType === 'tests'}
					Вам предстоит пройти 6 когнитивных тестов подряд. Убедитесь, что у вас есть достаточно времени и вас ничего не отвлекает.
				{:else}
					Отправить слова можно только один раз. Второй попытки не будет. Убедитесь, что вы готовы.
				{/if}
			</p>
			<Button color="green" onclick={confirmAction}>Продолжить</Button>
			<Button color="red" onclick={() => (showDisclaimer = false)}>Отмена</Button>
		</div>
	</Modal>
{/if}
