<script>
	import { enhance } from '$app/forms';
	import '../app.css';
	import '@fontsource/roboto';
	import { userStore } from '$lib/stores';
	import { onMount } from 'svelte';
	import Button from '$lib/components/button.svelte';
	let { data, children } = $props();

	onMount(() => {
		userStore.set(data.user || '');
	});
</script>

<form class="logout-form" method="POST" action="/?/logout" use:enhance>
	<span>User ID: {$userStore}</span>
	<button type="submit" class="logout-button" disabled={$userStore == ''}>Выйти</button>
</form>

<div class="container">
	{@render children()}
</div>

<style>
	.container {
		max-width: 600px;
		margin: 10vh auto;
		padding: 10px 10px;
		display: flex;
		flex-direction: column;
		justify-content: center; /* Центрирование по горизонтали */
		align-items: center; /* Центрирование по вертикали */
		transition: height 0.5s ease; /* Анимация изменения высоты */
		gap: 10px;
	}

	.logout-form {
		position: absolute;
		top: 10px;
		width: 100%;
		display: flex;
		justify-content: space-around;
		align-items: center;
		font-size: small;
	}

	.logout-button {
		width: 80px;
		padding: 5px;
		background-color: #bf3023;
		color: #fff;
		border: none;
		border-radius: 5px;
		font-size: 16px;
		cursor: pointer;
	}

	button:disabled,
	button[disabled] {
		border: 1px solid #999999;
		background-color: #888888;
		color: #666666;
	}
</style>
