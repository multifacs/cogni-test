<script lang="ts">
	import cities from './russia-cities.json';

	let { query = $bindable() } = $props();

	let value = $state('');
	let isOpen = $state(false);

	interface City {
		id: string;
		name: string;
		name_en?: string;
		type: string;
		region: { name: string };
	}

	// filter only cities with type === "Город"
	const cityOptions = (cities as City[]).filter((c) => c.type === 'Город');

	// derived filtered list
	const filtered = $derived(
		query
			? cityOptions
					.filter(
						(c) =>
							c.name.toLowerCase().includes(query.toLowerCase()) ||
							c.name_en?.toLowerCase().includes(query.toLowerCase())
					)
					.slice(0, 3)
			: cityOptions.slice(0, 3) // limit initial list
	);

	function selectCity(city: City) {
		value = city.id;
		query = city.name;
		isOpen = false;
	}

	function handleFocusOut(e: FocusEvent) {
		// Small delay to allow click on dropdown items to register
		const target = e.relatedTarget;
		if (
			target instanceof Node &&
			e.currentTarget instanceof Node &&
			e.currentTarget.contains(target)
		) {
			return;
		}
		setTimeout(() => {
			isOpen = false;
		}, 100);
	}
</script>

<div class="relative w-full">
	<!-- Input -->
	<input
		bind:value={query}
		onfocus={() => (isOpen = true)}
		oninput={() => (isOpen = true)}
		onfocusout={handleFocusOut}
		placeholder="Начните печатать..."
		class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 outline-none transition-colors duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
	/>

	<!-- Dropdown -->
	{#if isOpen && filtered.length > 0}
		<ul
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-600 bg-gray-700 shadow-lg"
		>
			{#each filtered as city (city.id)}
				<li class="transition-colors duration-200 hover:bg-gray-600">
					<button
						type="button"
						class="w-full px-3 py-2 text-left text-sm text-gray-100"
						onclick={() => selectCity(city)}
					>
						{city.name} ({city.region.name})
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
