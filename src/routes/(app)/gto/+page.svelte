<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { TEST_ORDER } from '$lib/tests';

	let { data } = $props();

	let showDisclaimer = $state(false);
	let disclaimerType = $state<'tests' | 'words'>('tests');
	let selectedSession = $state<{ gtoSessionId: string; currentTestIndex: number }>({
		gtoSessionId: '',
		currentTestIndex: 0
	});

	function showTestDisclaimer(sessionId: string, currentTestIndex: number) {
		selectedSession = { gtoSessionId: sessionId, currentTestIndex };
		disclaimerType = 'tests';
		showDisclaimer = true;
	}

	function showWordsDisclaimer(sessionId: string) {
		selectedSession = { gtoSessionId: sessionId, currentTestIndex: 0 };
		disclaimerType = 'words';
		showDisclaimer = true;
	}

	function confirmAction() {
		showDisclaimer = false;
		if (disclaimerType === 'tests') {
			window.location.href = `/gto/session/${selectedSession.gtoSessionId}/play`;
		} else {
			window.location.href = `/gto/session/${selectedSession.gtoSessionId}/words`;
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
				{#if session.status === 'paused'}
					{#if !session.hasCompletedTests}
						<p class="mb-2 text-sm text-yellow-400">Сессия приостановлена</p>
					{:else if !session.hasSubmittedWords}
						<Button color="yellow" onclick={() => showWordsDisclaimer(session.gtoSessionId)}
							>Заполнить последовательность слов</Button
						>
					{:else}
						<p class="text-gray-400"
							>Вы завершили электронную часть. Ожидайте результатов.</p
						>
					{/if}
				{:else if !session.hasCompletedTests}
					{#if session.currentTestIndex > 0}
						<p class="mb-2 text-sm text-gray-400">
							Пройдено тестов: {session.currentTestIndex} из {TEST_ORDER.length}
						</p>
					{/if}
					<Button
						color="blue"
						onclick={() => showTestDisclaimer(session.gtoSessionId, session.currentTestIndex)}
					>
						{session.currentTestIndex > 0 ? 'Продолжить тестирование' : 'Начать тестирование'}
					</Button>
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
					{selectedSession.currentTestIndex > 0 ? 'Продолжить тестирование?' : 'Начать тестирование?'}
				{:else}
					Заполнить последовательность слов?
				{/if}
			</h2>
		{/snippet}
		<div class="flex flex-col gap-4">
			<p class="text-white">
				{#if disclaimerType === 'tests'}
					{#if selectedSession.currentTestIndex > 0}
						Вы прошли {selectedSession.currentTestIndex} из {TEST_ORDER.length} тестов. Продолжить со следующего?
					{:else}
						Вам предстоит пройти {TEST_ORDER.length} когнитивных тестов подряд. Убедитесь, что у вас есть достаточно времени и вас ничего не отвлекает.
					{/if}
				{:else}
					Отправить слова можно только один раз. Второй попытки не будет. Убедитесь, что вы готовы.
				{/if}
			</p>
			<Button color="green" onclick={confirmAction}>Продолжить</Button>
			<Button color="red" onclick={() => (showDisclaimer = false)}>Отмена</Button>
		</div>
	</Modal>
{/if}
