<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
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

<main
	class="flex h-full w-full max-w-md flex-col items-center gap-6 overflow-y-auto p-4 text-white"
>
	<h1 class="text-2xl font-bold">Определение когнитивного возраста</h1>

	<div class="w-full rounded-3xl bg-blue-100 p-4 text-center text-blue-900 shadow">
		<p class="text-lg font-medium">🧠 Когнитивный возраст</p>
		<p class="mt-1 text-3xl font-bold">
			{#if data.predictedAge !== null && data.predictedAge !== undefined}
				{Math.round(data.predictedAge)} лет
			{:else}
				<span title="Пройдите хотя бы один раз каждый тест">??</span>
			{/if}
		</p>
		<p class="text-xs opacity-70">⚠️ Я только учусь, и я могу ошибаться ⚠️</p>
	</div>

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

		<div class="flex w-full flex-col gap-3">
			{#each data.tests as { name, title, path, img }}
				<a
					href={path}
					class="flex items-center justify-between rounded-2xl bg-gray-600 p-3 shadow transition hover:bg-gray-100 hover:text-black"
				>
					<div class="flex flex-col gap-1">
						<span class="text-lg">{title}</span>
						{#if testSessionCounts[name]}
							<span class="text-sm font-medium text-lime-200">
								Пройдено: {testSessionCounts[name]}
							</span>
						{:else}
							<span class="text-sm text-orange-400"> Не пройдено </span>
						{/if}
					</div>
					<img src={img} alt={name} class="h-14 w-14 rounded-xl bg-white" />
				</a>
			{/each}
		</div>
	{/if}
</main>
