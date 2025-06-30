<script lang="ts">
	import { userStore } from '$lib/stores/user.js';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		userStore.set(data.user || '');
	});
</script>

<main
	class="flex h-full w-full max-w-md flex-col items-center gap-6 overflow-y-auto p-4 text-white"
>
	<h1 class="text-2xl font-bold">🧪 Определение когнитивного возраста</h1>

	<div class="w-full rounded-3xl bg-blue-100 p-4 text-center text-blue-900 shadow">
		<p class="text-lg font-medium">🧠 Когнитивный возраст</p>
		<p class="mt-1 text-3xl font-bold">
			{#if data.predictedAge !== null}
				{Math.round(data.predictedAge)} лет
			{:else}
				<span title="Пройдите хотя бы один раз каждый тест">??</span>
			{/if}
		</p>
		<p class="text-xs opacity-70">⚠️ Я только учусь, и я могу ошибаться ⚠️</p>
	</div>

	<div class="flex w-full flex-col gap-3">
		{#each data.tests as { name, title, path, img }}
			<a
				href={path}
				class="flex items-center justify-between rounded-2xl bg-gray-600 p-3 shadow transition hover:bg-gray-100 hover:text-black"
			>
				<span class="text-lg">{title}</span>
				<img src={img} alt={name} class="h-14 w-14 rounded-xl bg-white" />
			</a>
		{/each}
	</div>
</main>
