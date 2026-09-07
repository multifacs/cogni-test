<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/state';
	import { articleRegistry } from '$lib/articles';
	import type { LayoutProps } from './$types';
	import Button from '$lib/components/ui/Button.svelte';

	let { children }: LayoutProps = $props();
	const headerContext = getContext<{ value: string }>('headerText');

	// Заголовок шапки = название статьи (как у тестов), «Статьи» — если slug не найден.
	// $effect, а не onMount: при клиентской навигации между статьями layout не перемонтируется.
	$effect(() => {
		if (!headerContext) return;
		const slug = page.url.pathname.split('/').filter(Boolean).pop();
		headerContext.value = (slug && articleRegistry[slug]?.title) || 'Статьи';
	});
</script>

<main class="main mx-auto flex w-full max-w-5xl flex-col items-center justify-center-safe gap-6">
	{@render children()}
</main>
<section class="low-content w-full flex justify-center">
	<Button color="red" goto="/materials">Назад</Button>
</section>
