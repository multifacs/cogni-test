<script lang="ts">
	import { userStore } from '$lib/stores/user.js';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		userStore.set(data.user || '');
		console.log('Тесты:', Object.entries(data.tests));
		console.log('Возраст:', data.predictedAge);
	});
</script>

<div
	class="flex min-h-0 w-full max-w-96 grow-0 flex-col items-center gap-4 rounded-4xl bg-gray-700 p-5 max-xs:p-2 shadow-md"
>
	<h1 class="max-xs:hidden">Тесты</h1>
	<h2 class="xs:hidden">Тесты</h2>

	<!-- 💡 Когнитивный возраст -->
	<div class="rounded-3xl bg-blue-300 p-4 text-center text-black shadow-md w-full">
		<p class="text-lg font-semibold">Ваш когнитивный возраст:</p>
		<p class="text-2xl font-bold mt-2">
			{#if data.predictedAge !== null}
				{Math.round(data.predictedAge)} лет
			{:else}
				<span title="Пройдите хотя бы один раз каждый тест">
					??
				</span>
			{/if}
		</p>
	</div>

	<div class="test-container flex w-full flex-col items-center gap-4 overflow-y-auto rounded-3xl mt-4">
		{#each data.tests as { name, title, path, img }}
			<a
				href={path}
				class="test-button gap- box-border flex w-full shrink-0 grow-0 items-center justify-between rounded-3xl bg-gray-600 p-2.5 shadow-md transition hover:bg-gray-50"
			>
				<span>{title}</span>
				<img src={img} alt={name} class="test-icon ml-2 h-16 w-16 rounded-2xl" />
			</a>
		{/each}
	</div>
</div>

<style>
	.test-container {
		scrollbar-width: none;
	}
	.test-button span {
		color: var(--main-text-color);
		transition: 0.2s ease;
	}

	.test-button img {
		background-color: var(--main-text-color);
	}

	.test-button:hover {
		background-color: var(--main-text-color);
	}

	.test-button:hover span {
		color: #3b3b3b;
	}
</style>
