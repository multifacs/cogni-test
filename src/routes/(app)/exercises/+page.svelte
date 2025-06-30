<script lang="ts">
	import { userStore } from '$lib/stores/user.js';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		userStore.set(data.user || '');
	});
</script>

<main
	class="flex h-full w-full max-w-md grow flex-col items-center gap-6 overflow-y-auto p-4 text-white"
>
	<h1 class="text-2xl font-bold">Когнитивный тренажёр</h1>
	<div class="w-full rounded-2xl bg-blue-100 p-4 text-center text-blue-900 shadow">
		<p class="text-xs opacity-70">👼 Это только начало, следи за моим ростом 👼</p>
	</div>

	<div class="flex w-full flex-col gap-3">
		{#each data.exercises as { name, title, path, img }}
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
