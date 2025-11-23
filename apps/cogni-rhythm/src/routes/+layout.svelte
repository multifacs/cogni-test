<script lang="ts">
	import '../app.css';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import { dev } from '$app/environment';
	import { onMount } from 'svelte';
    import { userManager } from '$lib/userStore';
	import { goto } from '$app/navigation';

	let { children } = $props();

	onMount(async () => {
		if (!('serviceWorker' in navigator)) {
			throw new Error('Service workers not supported');
		}

		navigator.serviceWorker.register('/service-worker.js', {
			type: dev ? 'module' : 'classic'
		});

        const auth = await userManager.checkAuth();
        if (!auth) {
            goto('/');
        }
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
