<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { TEST_ORDER, testRegistry } from '$lib/tests';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		invalidateAll();
	});

	let showDisclaimer = $state(false);
	let disclaimerType = $state<'tests' | 'words'>('tests');
	let selectedSession = $state<{
		gtoSessionId: string;
		currentTestIndex: number;
	}>({
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

	let targetUrl = $derived(
		disclaimerType === 'tests'
			? `/gto/session/${selectedSession.gtoSessionId}/play`
			: `/gto/session/${selectedSession.gtoSessionId}/words`
	);

	function confirmAction() {
		showDisclaimer = false;
		goto(resolve(targetUrl));
	}

	const statusConfig = {
		active: {
			label: 'Активна',
			bg: 'bg-green-800/60',
			text: 'text-green-200',
			dot: 'bg-green-400'
		},
		paused: {
			label: 'На паузе',
			bg: 'bg-yellow-800/60',
			text: 'text-yellow-200',
			dot: 'bg-yellow-400'
		},
		completed: {
			label: 'Завершена',
			bg: 'bg-gray-600/60',
			text: 'text-gray-300',
			dot: 'bg-gray-400'
		}
	} as const;

	function getStatusStyle(status: string) {
		return statusConfig[status as keyof typeof statusConfig] ?? statusConfig.active;
	}

	function getProgressLabel(index: number): string {
		const testType = TEST_ORDER[index];
		const test = testRegistry[testType];
		return test?.title ?? testType;
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString('ru-RU');
	}
</script>

<section class="banner">
	<h1 class="text-2xl font-bold">Сессия ГТО-М</h1>
</section>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-6">
		{#if data.activeSessions.length === 0 && data.completedSessions.length === 0}
			<div class="flex flex-col items-center gap-3 py-10 text-gray-400">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-14 w-14 opacity-30"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<p class="text-center text-lg">У вас нет сессий ГТО-М</p>
				<p class="text-center text-sm text-gray-500">
					Когда вам назначат сессию, она появится здесь
				</p>
			</div>
		{:else}
			<!-- Active sessions -->
			{#if data.activeSessions.length > 0}
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{#each data.activeSessions as session (session.gtoSessionId)}
						{@const ss = getStatusStyle(session.status)}
						{@const progress = session.currentTestIndex}
						{@const total = TEST_ORDER.length}
						{@const percent = Math.round((progress / total) * 100)}
						<div
							class="flex flex-col gap-4 rounded-xl border border-gray-700 bg-gray-800/50 p-4 transition-colors"
						>
							<!-- Session header -->
							<div class="flex items-center justify-between">
								<h2 class="truncate text-lg font-semibold">{session.name}</h2>
								<span
									class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs {ss.bg} {ss.text}"
								>
									<span class="h-1.5 w-1.5 rounded-full {ss.dot}"></span>
									{ss.label}
								</span>
							</div>

							<!-- Progress section — shown when tests are in progress or completed -->
							{#if session.status === 'paused'}
								{#if !session.hasCompletedTests}
									<div
										class="rounded-lg border border-yellow-800/40 bg-yellow-900/20 px-3 py-2 text-sm text-yellow-300"
									>
										⏸ Сессия приостановлена
									</div>
								{:else if !session.hasSubmittedWords}
									<div
										class="rounded-lg border border-green-800/40 bg-green-900/20 px-3 py-2 text-sm text-green-300"
									>
										✓ Все тесты пройдены
									</div>
								{:else}
									<div
										class="rounded-lg border border-gray-700 bg-gray-900/30 px-3 py-2 text-sm text-gray-400"
									>
										Вы завершили электронную часть. Ожидайте результатов.
									</div>
								{/if}
							{:else if !session.hasCompletedTests}
								<!-- Active session, tests in progress -->
								<div class="flex flex-col gap-2.5">
									{#if progress > 0}
										<div class="flex items-center justify-between text-sm">
											<span class="text-gray-400"
												>Пройдено тестов: <span
													class="font-medium text-white"
													>{progress} из {total}</span
												></span
											>
											<span class="tabular-nums text-xs text-gray-500"
												>{percent}%</span
											>
										</div>
										<!-- Progress bar -->
										<div class="h-2 overflow-hidden rounded-full bg-gray-700">
											<div
												class="h-full rounded-full bg-blue-500 transition-all duration-500"
												style="width: {percent}%"
											></div>
										</div>
										<!-- Test list -->
										<div class="flex flex-col gap-1">
											{#each TEST_ORDER as testType, i (testType)}
												{@const test = testRegistry[testType]}
												{@const done = i < progress}
												{@const current = i === progress}
												<div
													class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm {current
														? 'bg-blue-900/30 ring-1 ring-blue-500/40'
														: done
															? 'opacity-60'
															: 'opacity-30'}"
												>
													{#if done}
														<svg
															xmlns="http://www.w3.org/2000/svg"
															class="h-4 w-4 shrink-0 text-green-400"
															viewBox="0 0 20 20"
															fill="currentColor"
														>
															<path
																fill-rule="evenodd"
																d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																clip-rule="evenodd"
															/>
														</svg>
													{:else if current}
														<span
															class="flex h-4 w-4 shrink-0 items-center justify-center text-xs font-bold text-blue-300"
															>▶</span
														>
													{:else}
														<span class="h-4 w-4 shrink-0"></span>
													{/if}
													<span
														class={current
															? 'font-medium text-white'
															: done
																? 'text-gray-400'
																: 'text-gray-500'}
													>
														{i + 1}. {test?.title ?? testType}
													</span>
												</div>
											{/each}
										</div>
									{:else}
										<p class="text-sm text-gray-400">
											Вам предстоит пройти {total} когнитивных тестов подряд.
										</p>
									{/if}
								</div>
							{:else if !session.hasSubmittedWords}
								<div
									class="rounded-lg border border-green-800/40 bg-green-900/20 px-3 py-2 text-sm text-green-300"
								>
									✓ Все тесты пройдены
								</div>
							{:else}
								<div
									class="rounded-lg border border-gray-700 bg-gray-900/30 px-3 py-2 text-sm text-gray-400"
								>
									Вы завершили электронную часть. Ожидайте результатов.
								</div>
							{/if}

							<!-- Action buttons -->
							<div class="flex gap-2">
								{#if session.status === 'paused'}
									{#if !session.hasCompletedTests}
										<!-- nothing -->
									{:else if !session.hasSubmittedWords}
										<Button
											color="yellow"
											class="flex-1"
											onclick={() =>
												showWordsDisclaimer(session.gtoSessionId)}
											>Заполнить последовательность слов</Button
										>
									{/if}
								{:else if !session.hasCompletedTests}
									<Button
										color="blue"
										class="flex-1"
										onclick={() =>
											showTestDisclaimer(
												session.gtoSessionId,
												session.currentTestIndex
											)}
									>
										{session.currentTestIndex > 0
											? 'Продолжить тестирование'
											: 'Начать тестирование'}
									</Button>
								{:else if !session.hasSubmittedWords}
									<Button
										color="yellow"
										class="flex-1"
										onclick={() => showWordsDisclaimer(session.gtoSessionId)}
										>Заполнить последовательность слов</Button
									>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Completed sessions -->
			{#if data.completedSessions.length > 0}
				<div class="flex items-center gap-3">
					<h2 class="text-lg font-semibold">Завершённые сессии</h2>
					<span class="text-sm text-gray-400">({data.completedSessions.length})</span>
				</div>
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
					{#each data.completedSessions as session (session.gtoSessionId)}
						{@const ss = getStatusStyle(session.status)}
						<div
							class="flex flex-col gap-3 rounded-xl border border-gray-700 bg-gray-800/30 p-4 transition-colors"
						>
							<div class="flex items-center justify-between">
								<h2 class="truncate text-lg font-semibold">{session.name}</h2>
								<span
									class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs {ss.bg} {ss.text}"
								>
									<span class="h-1.5 w-1.5 rounded-full {ss.dot}"></span>
									{ss.label}
								</span>
							</div>
							<p class="text-xs text-gray-500">{formatDate(session.createdAt)}</p>
							{#if session.wordScore !== null}
								<div class="flex items-center gap-2 text-sm">
									<span class="text-gray-400">Слова:</span>
									<span class="font-medium text-purple-300"
										>{session.wordScore}/5</span
									>
								</div>
							{/if}
							<Button
								color="gray"
								class="w-full"
								goto="/gto/session/{session.gtoSessionId}/results"
							>
								Просмотр результатов
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</main>

<section class="low-content flex items-center justify-center">
	<p class="max-w-md text-center text-sm text-gray-500 max-md:text-xs">
		Пройдите все тесты и заполните последовательность слов для завершения сессии.
	</p>
</section>

{#if showDisclaimer}
	<Modal bind:showModal={showDisclaimer}>
		{#snippet header()}
			<h2 class="text-2xl text-white">
				{#if disclaimerType === 'tests'}
					{selectedSession.currentTestIndex > 0
						? 'Продолжить тестирование?'
						: 'Начать тестирование?'}
				{:else}
					Заполнить последовательность слов?
				{/if}
			</h2>
		{/snippet}
		<div class="flex flex-col items-center gap-4 text-center">
			<p class="text-white">
				{#if disclaimerType === 'tests'}
					{#if selectedSession.currentTestIndex > 0}
						Вы прошли {selectedSession.currentTestIndex} из {TEST_ORDER.length}
						тестов.
						<br /><br />
						Следующий тест:
						<span class="font-semibold"
							>{selectedSession.currentTestIndex + 1}.
							{getProgressLabel(selectedSession.currentTestIndex)}</span
						>
						<br /><br />
						Продолжить?
					{:else}
						Вам предстоит пройти {TEST_ORDER.length} когнитивных тестов подряд. Убедитесь,
						что у вас есть достаточно времени и вас ничего не отвлекает.
					{/if}
				{:else}
					Отправить слова можно только один раз. Второй попытки не будет. Убедитесь, что
					вы готовы.
				{/if}
			</p>
			<div class="flex gap-4">
				<Button color="green" onclick={confirmAction}>Продолжить</Button>
				<Button color="red" onclick={() => (showDisclaimer = false)}>Отмена</Button>
			</div>
		</div>
	</Modal>
{/if}
