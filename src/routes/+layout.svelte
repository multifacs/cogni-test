<script>
	import { enhance } from '$app/forms';
	import '../app.css';
	import '@fontsource/roboto';
	import { userStore } from '$lib/stores';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		userStore.set(data.user || "");
    });
</script>

<form class="logout-form" method="POST" action="/?/logout" use:enhance>
	{$userStore} <button type="submit" class="logout-button" disabled={ $userStore == '' }>Выйти</button>
</form>

<div class="container">
	<slot />
</div>

<style>
	.container {
		max-width: 600px;
		margin: 10vh auto;
		display: flex;
		flex-direction: column;
		justify-content: center; /* Центрирование по горизонтали */
		align-items: center; /* Центрирование по вертикали */

		height: 500px;
		transition: height 0.5s ease; /* Анимация изменения высоты */
	}

	.logout-form {
		position: absolute;
		top: 10px;
		right: 10px;
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
