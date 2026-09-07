<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { userStore } from '$lib/stores/user.js';
	import localforage from 'localforage';
	import { getContext, onMount } from 'svelte';

	import RecommendationCard from '$lib/components/ui/RecommendationCard.svelte';

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
				goto(resolve('/home'));
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

<main class="main flex w-full flex-col items-center justify-center-safe">
	<div class="flex w-full max-w-5xl flex-col items-center justify-center-safe gap-4 sm:gap-12">
		{#if runAllMode}
			<Spinner></Spinner>
		{:else}
			<!-- <div class="glass-bg" aria-hidden="true">
					<div class="glass-blob glass-blob--top"></div>
					<div class="glass-blob glass-blob--bottom"></div>
				</div> -->

			<!-- {#if Object.keys(testSessionCounts).length < data.tests.length}
				<div class="glass-card flex w-full flex-col gap-2 rounded-3xl p-4 text-center shadow">
					<p class="mt-2 text-xl font-semibold">У вас есть непройденные тесты</p>
					<p class="mt-1 text-sm opacity-80">Запустить потоковое прохождение?</p>
					<Button color="red" onclick={runAll}>Начать</Button>
				</div>
			{/if} -->

			<div class="w-fill">
				<RecommendationCard
					title="Запуск потокового прохождения"
					text="Регулярные тренировки помогают поддерживать когнитивные навыки"
					icon="/brain.svg"
					goto="/tests"
					button_text="Начать прохождение"
				/>
			</div>

			<div class="flex flex-wrap justify-around gap-6 sm:justify-center">
				{#each data.tests as { name, title, path, img } (title)}
					<ExerciseCard {name} {title} {path} {img} {testSessionCounts} />
				{/each}
			</div>
		{/if}
	</div>
</main>

<!-- <div class="low-content grid grid-cols-3 gap-5 text-center items-center">
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
</div> -->
