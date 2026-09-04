<!-- src/routes/questionary/components/Autocomplete.svelte -->
<script lang="ts">
	import cities from './russia-cities.json';

	let { query = $bindable() } = $props();
	let isOpen = $state(false);

	type City = {
		name: string;
		name_en?: string;
		type: string;
	};

	// filter only cities with type === "Город"
	const cityOptions = cities.filter((c) => c.type === 'Город');

	// reactive filtered list - правильное использование $derived
	let filtered = $derived(
		query
			? cityOptions
					.filter(
						(c) =>
							c.name.toLowerCase().includes(query.toLowerCase()) ||
							c.name_en?.toLowerCase().includes(query.toLowerCase())
					)
					.slice(0, 3)
			: cityOptions.slice(0, 3)
	);

	function selectCity(city: City) {
		query = city.name;
		isOpen = false;
	}

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		query = e.currentTarget.value;
		isOpen = true;
	}
</script>

<div class="relative w-full">
	<!-- Input -->
	<input
		value={query}
		oninput={handleInput}
		onfocus={() => (isOpen = true)}
		onfocusout={() => setTimeout(() => (isOpen = false), 200)}
		placeholder="Начните печатать..."
		class="w-full rounded-sm border px-3 py-2 text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
		class:border-blue-300={query != null}
		class:border-orange-400={query == null}
		class:border-2={query == null}
		class:shadow-[0px_0px_5px_2px_rgba(249,_115,_22,_0.5)]={query == null}
	/>

	<!-- Dropdown -->
	{#if isOpen && filtered.length > 0}
		<ul
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-blue-300 bg-white shadow"
		>
			{#each filtered as city (city.id)}
				<li class="cursor-pointer px-3 py-2 hover:bg-blue-50">
					<button class="w-full text-left" onclick={() => selectCity(city)}>
						{city.name} ({city.region.name})
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
