<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { testRegistry } from '$lib/tests';
	import type { TestType } from '$lib/tests/types';

	let { data } = $props();

	const TEST_ORDER: TestType[] = ['stroop', 'math', 'munsterberg', 'campimetry', 'memory', 'swallow'];

	let currentIndex = $state(data.currentTestIndex || 0);
	let phase = $state<'instructions' | 'playing'>('instructions');
	let TestComponent: any = $state(null);
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

	function startTest() {
		phase = 'playing';
	}

	async function onGameEnd() {
		// Test completed, advance to next or finish
	}

	async function onSendResults(results: any) {
		isSaving = true;

		const response = await fetch(`/gto/session/${data.session.id}/words`, {
			method: 'POST',
			body: JSON.stringify({ action: 'save-result', testType: currentTestType, results }),
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			console.error('Failed to save results');
			isSaving = false;
			return;
		}

		// Advance to next test or finish
		if (currentIndex < TEST_ORDER.length - 1) {
			currentIndex++;
			phase = 'instructions';
		} else {
			// All tests done — mark completed
			await fetch(`/gto/session/${data.session.id}/words`, {
				method: 'POST',
				body: JSON.stringify({ action: 'complete' }),
				headers: { 'Content-Type': 'application/json' }
			});
			goto(`/gto/session/${data.session.id}/words`);
		}

		isSaving = false;
	}
</script>

<section class="banner">
	<h1 class="text-2xl font-bold">Тест {progress}: {currentTest?.title ?? currentTestType}</h1>
</section>

{#if phase === 'instructions'}
	<main class="main flex flex-col items-center justify-center gap-4">
		<h2 class="text-xl">{currentTest?.title ?? currentTestType}</h2>
		<p class="max-w-md text-center text-gray-400"
			>Нажмите "Начать" когда будете готовы. Тест начнётся сразу.</p
		>
		<Button color="green" onclick={startTest}>Начать</Button>
	</main>

	<section class="low-content flex items-center justify-center">
		<Button color="red" goto="/gto">Выйти</Button>
	</section>
{:else if TestComponent && !isSaving}
	<main class="main flex flex-col items-center justify-evenly">
		<TestComponent
			gameEnd={onGameEnd}
			sendResults={onSendResults}
			{data}
		/>
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
