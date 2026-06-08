<script lang="ts">
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { exerciseRegistry } from '$lib/exercises';

	const { data } = $props();
	const slug = data.slug;
	const exercise = $derived(exerciseRegistry[slug]);
	let Component: any = $state(null);

	$effect(() => {
		Component = null;
		if (exercise) {
			exercise.about().then((mod) => {
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

	{#if !exercise?.hasPlayground}
		<section class="low-content grid grid-cols-3 gap-4">
			<div></div>
			<Button color="red" goto="/exercises">Назад</Button>
			<div></div>
		</section>
	{:else}
		<section class="low-content grid grid-cols-2 gap-4">
			<Button color="red" goto="/exercises">Назад</Button>
			<Button color="green" goto={`/exercises/${slug}/playground`}>Начать</Button>
		</section>
	{/if}
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка упражнения {slug}...</p>
	</main>

	<section class="low-content flex justify-center gap-2 align-middle">
		<Button color="red" goto="/exercises">Назад</Button>
	</section>
{/if}
