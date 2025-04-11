<script lang="ts">
	import { userStore } from '$lib/stores/user.js';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		userStore.set(data.user || '');
		console.log(Object.entries(data.tests));
	});
</script>

<div
	class="test-container
	flex
	max-h-[80vh]
	max-w-[350px]
	min-w-[300px]
	flex-col
	items-center
	gap-4
	rounded-4xl
	bg-gray-700
	p-5
	shadow-md
	"
>
	<h1 class="">Тесты</h1>

	<div
		class="test-container
	flex
	shrink-1
	flex-col
	items-center
	gap-4
	overflow-y-scroll
	rounded-3xl
	"
	>
		{#each data.tests as { name, title, path, img }}
			<a
				href={path}
				class="test-button
			box-border
			flex w-full
			items-center
			justify-between
			gap-2
			rounded-3xl
			bg-gray-600
			p-2.5
			shadow-md
			transition
			hover:bg-gray-50
			"
			>
				<span>{title}</span>
				<img
					src={img}
					alt={name}
					class="test-icon
				h-16
				w-16
				rounded-2xl
				"
				/>
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
