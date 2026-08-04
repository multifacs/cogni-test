<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { userStore } from '$lib/stores/user.js';
	import localforage from 'localforage';
	import { onMount } from 'svelte';

	let { data } = $props();

	let testSessionCounts: Record<string, number> = $state({});
	let runAllMode = $state(true);

	onMount(async () => {
		runAllMode = (await localforage.getItem('runAllMode')) || false;
		console.log(data);
		userStore.set(data.user || '');

		if (data.testSessionCounts) {
			testSessionCounts = data.testSessionCounts;

			console.log(Object.keys(testSessionCounts).length == data.tests.length);
			if (Object.keys(testSessionCounts).length == data.tests.length) {
				localforage.setItem('runAllMode', false);
				runAllMode = false;
			}
		}

		if (await localforage.getItem('runAllMode')) {
			runAllMode = (await localforage.getItem('runAllMode')) || false;
			// Redirect to the first uncompleted test
			const uncompletedTest = data.tests.find((test) => !testSessionCounts[test.name]);
			console.log('Redirecting to uncompleted test:', uncompletedTest);
			if (uncompletedTest) {
				goto(uncompletedTest.path);
			}
		}
	});

	function runAll() {
		localforage.setItem('runAllMode', true);
		runAllMode = true;

		const uncompletedTest = data.tests.find((test) => !testSessionCounts[test.name]);
		console.log('Redirecting to uncompleted test:', uncompletedTest);
		if (uncompletedTest) {
			goto(uncompletedTest.path);
		}
	}
</script>

<!-- <section class="banner">
	<h1 class="font-bold max-md:hidden">Определение когнитивного возраста</h1>
	<h2 class="font-bold md:hidden">Когнитивный возраст</h2>
</section> -->
<Header text={'Диагностика'}></Header>
<main class="main flex flex-col gap-3">
	{#if runAllMode}
		<Spinner></Spinner>
	{:else}
		{#if Object.keys(testSessionCounts).length < data.tests.length}
			<div
				class="flex w-full flex-col gap-2 rounded-3xl bg-red-200 p-4 text-center text-blue-900 shadow"
			>
				<p class="mt-2 text-xl font-semibold">У вас есть непройденные тесты</p>

				<p class="mt-1 text-sm opacity-80">Запустить потоковое прохождение?</p>

				<Button color="red" onclick={runAll}>Начать</Button>
			</div>
		{/if}

		<div class="flex flex-wrap justify-between gap-5 p-2">
			{#each data.tests as { name, title, path, img }}
				<ExerciseCard {name} {title} {path} {img} {testSessionCounts} />
			{/each}
		</div>
	{/if}
</main>
<!-- <section class="low-content grid grid-cols-3 items-center gap-5 text-center">
	<p class="text-xs font-medium max-md:hidden">🧠 Когнитивный возраст 🧠</p>
	<p class="text-xs font-medium md:hidden">🧠Когнитивный🧠 возраст</p>
	<p class="mt-1 text-3xl font-bold">
		{#if data.predictedAge !== null && data.predictedAge !== undefined}
			{Math.round(data.predictedAge)} лет
		{:else}
			<span title="Пройдите хотя бы один раз каждый тест">??</span>
		{/if}
	</p>
	<p class="text-xs font-medium max-md:hidden">⚠️ Я только учусь, и я могу ошибаться ⚠️</p>
	<p class="text-xs font-medium md:hidden">Могу ⚠️ошибаться⚠️</p>
</section> -->
