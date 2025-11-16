<script lang="ts">
	import '../app.css';
	import '@fontsource/roboto';
	import { browser, dev } from '$app/environment';
	let { data, children } = $props();

	import { onMount } from 'svelte';

	onMount(async () => {
		if (!browser || !('serviceWorker' in navigator)) {
			throw new Error('Service workers not supported');
		}

		await navigator.serviceWorker.register('/service-worker.js', {
			type: dev ? 'module' : 'classic'
		});
	});

</script>

<div class="fixed top-1 left-1 text-sm text-gray-500">
	{data.MODE}
</div>

{@render children()}
