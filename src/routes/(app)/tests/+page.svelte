<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { userStore } from '$lib/stores/user.js';
	import { tests } from '$lib/tests';
	import { translate } from '$lib/utils/common';
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
			const uncompletedTest = data.tests.find((test) => !testSessionCounts[test.name]);
			console.log('Redirecting to uncompleted test:', uncompletedTest);
			if (uncompletedTest) {
				goto(uncompletedTest.path);
			} else {
				goto('/home');
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
				class="flex w-full flex-col gap-2 rounded-3xl p-4 text-center shadow"
				style="background-color: #FCE7F3; color: #1E3A8A;"
			>
				<p class="mt-2 text-xl font-semibold">У вас есть непройденные тесты</p>
				<p class="mt-1 text-sm opacity-80">Запустить потоковое прохождение?</p>
				<Button color="red" onclick={runAll}>Начать</Button>
			</div>
		{/if}
		<div class="content flex flex-col items-center justify-center gap-8 pt-[2%] pb-[4%]">
			<h2 class="text-center">
				Регулярные тренировки помогают поддерживать когнитивные навыки
			</h2>
			<Button color="green">Запуск потокового прохождения</Button>
		</div>
		<div class="cards flex flex-wrap justify-center gap-5 p-2">
			{#each data.tests as { name, title, path, img }}
				<ExerciseCard {name} {title} {path} {img} {testSessionCounts} />
			{/each}
		</div>
	{/if}
</main>
<div class="low-content grid grid-cols-3 gap-5 text-center items-center">
	<p class="text-xs font-medium max-md:hidden">Когнитивный возраст</p>
	<p class="text-xs font-medium md:hidden">Когнитивный возраст</p>
	<p class="mt-1 text-3xl font-bold">
		{#if data.predictedAge !== null && data.predictedAge !== undefined}
			{Math.round(data.predictedAge)} лет
		{:else}
			<span title="Пройдите хотя бы один раз каждый тест">??</span>
		{/if}
	</p>
	<p class="text-xs font-medium max-md:hidden">Я только учусь, и я могу ошибаться</p>
	<p class="text-xs font-medium md:hidden">Могу ошибаться</p>
</div>

<style>
	@media (min-width: 1024px) {
		.cards {
			gap: 4vw;
		}
	}
</style>
