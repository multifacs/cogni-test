<script lang="ts">
	import '../app.css';
	import '@fontsource/roboto';
	import localforage from 'localforage';
	import { onMount } from 'svelte';
	let { children } = $props();

	onMount(async () => {
		if (!('serviceWorker' in navigator)) {
			throw new Error('Service workers not supported');
		}

		try {
			await localforage.setItem('TG_GROUP_LINK', 'https://t.me/+Q08ShGg2nSRhYTEy');
		} catch (err) {
			// This code runs if there were any errors.
			console.log(err);
		}
	});
</script>

<div class="fixed top-1 left-1 text-sm text-gray-500">dev</div>

{@render children()}
