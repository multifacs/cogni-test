<script lang="ts">
	import { userStore } from '$lib/stores/user.js';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		userStore.set(data.user || '');
	});
</script>

<section class="banner">
	<h1 class="text-3xl font-bold">Когнитивный тренажёр</h1>
</section>
<main class="main" style="display: flex; flex-direction: column; gap: 15px">
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
<section class="low-content gap-5">
	<p class="text-lg font-medium">👼 Это только начало, следи за моим ростом 👼</p>
</section>
