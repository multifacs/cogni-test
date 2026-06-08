<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { testRegistry } from '$lib/tests';

	const { data } = $props();
	const slug = data.slug;
	const test = $derived(testRegistry[slug]);
	let Component: any = $state(null);

	$effect(() => {
		Component = null;
		if (test) {
			test.about().then((mod) => {
				Component = mod.default;
			});
		}
	});
</script>

{#if Component}
	<main class="main box-border text-justify">
		<div class="flex min-h-full flex-col justify-center">
			<Component></Component>
		</div>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<Button color="red" goto="/tests">Назад</Button>
		<Button color="green" goto={`/tests/${slug}/playground`}>Начать</Button>
		<Button color="blue" goto={`/tests/${slug}/results`}>История</Button>
	</section>
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка теста {slug}...</p>
	</main>

	<section class="low-content flex justify-center gap-2 align-middle">
		<Button color="red" goto="/tests">Назад</Button>
	</section>
{/if}
