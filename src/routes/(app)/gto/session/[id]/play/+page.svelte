<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { testRegistry, TEST_ORDER } from '$lib/tests';
	import type { TestType } from '$lib/tests/types';
	import { resolve } from '$app/paths';

	let { data } = $props();

	let currentIndex = $state(data.currentTestIndex || 0);
	let phase = $state<'instructions' | 'playing'>('instructions');
	let TestComponent: any = $state(null);
	let AboutComponent: any = $state(null);
	let isSaving = $state(false);

	const currentTestType = $derived(TEST_ORDER[currentIndex] ?? TEST_ORDER[0]);
	const currentTest = $derived(testRegistry[currentTestType]);
	const progress = $derived(`${currentIndex + 1} / ${TEST_ORDER.length}`);
	const progressPercent = $derived(Math.round(((currentIndex + 1) / TEST_ORDER.length) * 100));

	$effect(() => {
		TestComponent = null;
		if (currentTest && phase === 'playing') {
			currentTest.playground().then((mod: any) => {
				TestComponent = mod.default;
			});
		}
	});

	// Load About component for instructions phase
	$effect(() => {
		AboutComponent = null;
		if (currentTest && phase === 'instructions') {
			currentTest.about().then((mod: any) => {
				AboutComponent = mod.default;
			});
		}
	});

	function startTest() {
		phase = 'playing';
	}

	function onGameEnd() {}

	async function onSendResults(results: any) {
		isSaving = true;

		try {
			const response = await fetch(`/gto/session/${data.session.id}/play`, {
				method: 'POST',
				body: JSON.stringify({ action: 'save-result', testType: currentTestType, results }),
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				console.error('Failed to save results');
				return;
			}

			if (currentIndex < TEST_ORDER.length - 1) {
				currentIndex++;
				phase = 'instructions';

				await fetch(`/gto/session/${data.session.id}/play`, {
					method: 'POST',
					body: JSON.stringify({ action: 'checkpoint', currentTestIndex: currentIndex }),
					headers: { 'Content-Type': 'application/json' }
				});
			} else {
				await fetch(`/gto/session/${data.session.id}/play`, {
					method: 'POST',
					body: JSON.stringify({ action: 'complete' }),
					headers: { 'Content-Type': 'application/json' }
				});
				goto(resolve(`/gto/session/${data.session.id}/words`), { invalidateAll: true });
			}
		} finally {
			isSaving = false;
		}
	}
</script>

<section class="banner">
	<div class="flex w-full flex-col items-center gap-1">
		<h1 class="text-2xl font-bold">Тест {progress}: {currentTest?.title ?? currentTestType}</h1>
		<!-- Mini progress bar -->
		<div class="flex w-full max-w-sm items-center gap-2">
			<div class="h-1 flex-1 overflow-hidden rounded-full bg-gray-700">
				<div
					class="h-full rounded-full bg-blue-500 transition-all duration-500"
					style="width: {progressPercent}%"
				></div>
			</div>
			<span class="shrink-0 text-xs tabular-nums text-gray-400"
				>{currentIndex + 1}/{TEST_ORDER.length}</span
			>
		</div>
	</div>
</section>

{#if phase === 'instructions'}
	<main class="main flex flex-col items-center justify-center gap-4">
		<h2 class="text-xl">{currentTest?.title ?? currentTestType}</h2>
		{#if AboutComponent}
			<div class="max-w-lg">
				<AboutComponent />
			</div>
		{:else}
			<p class="max-w-md text-center text-gray-400">Загрузка инструкции...</p>
		{/if}
		<Button color="green" onclick={startTest}>Начать</Button>
	</main>

	<section class="low-content flex items-center justify-center">
		<Button color="red" goto="/gto" invalidateAll>Выйти</Button>
	</section>
{:else if TestComponent && !isSaving}
	<main class="main flex flex-col items-center justify-evenly">
		<TestComponent gameEnd={onGameEnd} sendResults={onSendResults} {data} />
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto="/gto" invalidateAll>Выйти</Button>
		<div></div>
	</section>
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner />
		<p>Загрузка теста {currentTestType}...</p>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto="/gto" invalidateAll>Выйти</Button>
		<div></div>
	</section>
{/if}
