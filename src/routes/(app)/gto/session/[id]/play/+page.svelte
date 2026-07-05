<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { testRegistry, TEST_ORDER } from '$lib/tests';
	import type { TestType } from '$lib/tests/types';

	let { data } = $props();

	let currentIndex = $state(data.currentTestIndex || 0);
	let phase = $state<'instructions' | 'playing'>('instructions');
	let TestComponent: any = $state(null);
	let AboutComponent: any = $state(null);
	let isSaving = $state(false);

	const currentTestType = $derived(TEST_ORDER[currentIndex] ?? TEST_ORDER[0]);
	const currentTest = $derived(testRegistry[currentTestType]);
	const progress = $derived(`${currentIndex + 1} / ${TEST_ORDER.length}`);

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

	function onGameEnd() {
		goto('/gto');
	}

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

			// Advance to next test or finish
			if (currentIndex < TEST_ORDER.length - 1) {
				currentIndex++;
				phase = 'instructions';

				// Checkpoint: save progress
				await fetch(`/gto/session/${data.session.id}/play`, {
					method: 'POST',
					body: JSON.stringify({ action: 'checkpoint', currentTestIndex: currentIndex }),
					headers: { 'Content-Type': 'application/json' }
				});
			} else {
				// All tests done — mark completed
				await fetch(`/gto/session/${data.session.id}/play`, {
					method: 'POST',
					body: JSON.stringify({ action: 'complete' }),
					headers: { 'Content-Type': 'application/json' }
				});
				goto(`/gto/session/${data.session.id}/words`);
			}
		} finally {
			isSaving = false;
		}
	}
</script>

<section class="banner">
	<h1 class="text-2xl font-bold">Тест {progress}: {currentTest?.title ?? currentTestType}</h1>
</section>

{#if phase === 'instructions'}
	<main class="main flex flex-col items-center justify-center gap-4">
		{#if currentIndex > 0}
			<p class="text-sm text-yellow-400">Вы вышли из теста. Продолжите с последнего.</p>
		{/if}
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
		<Button color="red" goto="/gto">Выйти</Button>
	</section>
{:else if TestComponent && !isSaving}
	<main class="main flex flex-col items-center justify-evenly">
		<TestComponent gameEnd={onGameEnd} sendResults={onSendResults} {data} />
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto="/gto">Выйти</Button>
		<div></div>
	</section>
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner />
		<p>Загрузка теста {currentTestType}...</p>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto="/gto">Выйти</Button>
		<div></div>
	</section>
{/if}
