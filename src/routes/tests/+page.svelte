<script lang="ts">
	import { userStore } from '$lib/stores';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		userStore.set(data.user || '');
		console.log(Object.entries(data.tests))
	});
</script>

<h1>Тесты</h1>
<div class="test-container">
	{#each data.tests as {name, path, img}}
		<a href={path} class="test-button">
			<span>{name}</span>
			<img src={img} alt={name} class="test-icon" />
		</a>
	{/each}
</div>

<style>
	.test-container {
		background-color: #4c4c4c;
		padding: 20px;
		border-radius: 10px;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
		width: 300px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.test-button {
		background-color: #393939;
		border: 3px solid var(--main-text-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-sizing: border-box;
		padding: 10px 10px;
		border-radius: 10px;
		text-decoration: none;
		color: #333;
		font-size: 16px;
		transition: background-color 0.3s ease;
	}

	.test-button span {
		color: var(--main-text-color);
		transition: 0.3s ease;
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

	.test-icon {
		width: 100px;
		height: 50px;
		border-radius: 10%;
		object-fit: cover;
	}
</style>