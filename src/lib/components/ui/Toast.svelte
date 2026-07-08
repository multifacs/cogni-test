<script lang="ts">
	import { onMount } from 'svelte';

	let {
		message,
		type = 'info',
		onDismiss
	}: {
		message: string;
		type?: 'error' | 'success' | 'info';
		onDismiss: () => void;
	} = $props();

	let visible = $state(false);

	onMount(() => {
		requestAnimationFrame(() => {
			visible = true;
		});

		const timer = setTimeout(() => {
			visible = false;
			setTimeout(onDismiss, 300);
		}, 3000);

		return () => clearTimeout(timer);
	});

	const bgClass = $derived(
		type === 'error'
			? 'bg-red-800 border-red-600'
			: type === 'success'
				? 'bg-green-800 border-green-600'
				: 'bg-blue-800 border-blue-600'
	);
</script>

<div
	class="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-white shadow-lg transition-all duration-300 {bgClass} {visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}"
	role="alert"
>
	<span class="text-sm">{message}</span>
	<button class="ml-2 opacity-60 hover:opacity-100" onclick={onDismiss}>✕</button>
</div>
