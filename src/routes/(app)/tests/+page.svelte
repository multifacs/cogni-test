<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import ExerciseCard from '$lib/components/ui/ExerciseCard.svelte';
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

<main class="main flex flex-col gap-3">
	{#if runAllMode}
		<Spinner></Spinner>
	{:else}
		<div class="glass-scene">
			<!-- <div class="glass-bg" aria-hidden="true">
				<div class="glass-blob glass-blob--top"></div>
				<div class="glass-blob glass-blob--bottom"></div>
			</div> -->

			{#if Object.keys(testSessionCounts).length < data.tests.length}
				<div class="glass-card flex w-full flex-col gap-2 rounded-3xl p-4 text-center shadow">
					<p class="mt-2 text-xl font-semibold">У вас есть непройденные тесты</p>
					<p class="mt-1 text-sm opacity-80">Запустить потоковое прохождение?</p>
					<Button color="red" onclick={runAll}>Начать</Button>
				</div>
			{/if}
			<div class="content flex flex-col items-center justify-center gap-8 pt-[2%] pb-[4%]">
				<h2 class="text-center cta-headline">
					Регулярные тренировки помогают поддерживать когнитивные навыки
				</h2>
				<Button color="green">Запуск потокового прохождения</Button>
			</div>
			<div class="cards flex flex-wrap justify-center gap-5 p-2">
				{#each data.tests as { name, title, path, img } (title)}
					<ExerciseCard {name} {title} {path} {img} {testSessionCounts} />
				{/each}
			</div>
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
	.glass-scene {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.tests-content {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.cta-headline {
		font-weight: 800;
	}

	.low-content {
		background: rgba(255, 255, 255, 0.72);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.04),
			0 8px 24px rgba(0, 0, 0, 0.08),
			0 24px 64px rgba(30, 60, 114, 0.12);
		color: var(--main-text-color);
	}

	@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		.low-content {
			background: #ffffff;
		}
	}

	@media (max-width: 639px) {
		.tests-content {
			padding: 1rem;
			gap: 1rem;
		}
	}

	@media (min-width: 1024px) {
		.cards {
			gap: 4vw;
		}
	}
</style>
