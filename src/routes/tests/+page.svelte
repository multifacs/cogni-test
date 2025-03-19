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
	{#each Object.entries(data.tests) as [test, link]}
		<a href={link}>{test}</a>
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

	.test-container a {
		background-color: #dcdcdc;
		display: block;
		box-sizing: border-box;
		padding: 20px 10px;
		border-radius: 10px;
		text-decoration: none;
	}
</style>
