<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { testRegistry } from '$lib/tests';
	import { page } from '$app/state';

	const { data } = $props();
	const slug = data.slug;
	const test = $derived(testRegistry[slug]);
	let Component: any = $state(null);

	// GTO session integration
	const gtoSessionId = $derived(page.url.searchParams.get('gtoSessionId') ?? undefined);

	$effect(() => {
		Component = null;
		if (test) {
			test.about().then((mod) => {
				Component = mod.default;
			});
		}
	});

	const playgroundUrl = $derived(
		gtoSessionId
			? `/tests/${slug}/playground?gtoSessionId=${gtoSessionId}`
			: `/tests/${slug}/playground`
	);
</script>

{#if Component}
	<main class="main box-border text-justify">
		<div class="flex min-h-full flex-col justify-center">
			<Component></Component>
		</div>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<Button color="red" goto={gtoSessionId ? '/gto' : '/tests'}>Назад</Button>
		<Button color="green" goto={playgroundUrl}>Начать</Button>
		{#if gtoSessionId}
			<div></div>
		{:else}
			<Button color="blue" goto={`/tests/${slug}/results`}>История</Button>
		{/if}
	</section>
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка теста {slug}...</p>
	</main>

	<section class="low-content flex justify-center gap-2 align-middle">
		<Button color="red" goto={gtoSessionId ? '/gto' : '/tests'}>Назад</Button>
	</section>
{/if}
