<script>
	import { userStore } from '$lib/stores';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		userStore.set(data.user || "");
	});
</script>

<h1>Тесты</h1>

<a href="/tests/stroop">Тест Струпа</a>
