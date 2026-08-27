<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { userStore } from '$lib/stores/user.js';
	import localforage from 'localforage';
	import { getContext, onMount } from 'svelte';

	let { data } = $props();

	let testSessionCounts: Record<string, number> = $state({});
	let runAllMode = $state(true);
	const headerContext = getContext<{ value: string }>('headerText');

	onMount(async () => {
		if (headerContext) {
			headerContext.value = 'Диагностика';
		}
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
		<div class="content flex flex-col items-center justify-center gap-8 pt-[2%] pb-[4%]">
			<h2>Регулярные тренировки помогают поддерживать когнитивные навыки</h2>
			<Button color="green">Запуск потокового прохождения</Button>
		</div>
		<div class="cards flex flex-wrap justify-center gap-5 p-2">
			{#each data.tests as { name, title, path, img }}
				<ExerciseCard {name} {title} {path} {img} {testSessionCounts} />
			{/each}
		</div>
	{/if}
</main>
<style>
	@media (min-width: 1024px) {

		.cards {
			gap:4vw;
		}
	}
</style>
