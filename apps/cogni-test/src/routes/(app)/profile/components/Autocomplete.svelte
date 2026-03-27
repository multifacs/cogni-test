<script>
	import cities from './russia-cities.json';

	let value = '';
	let query = '';
	let isOpen = false;

	// filter only cities with type === "Город"
	const cityOptions = cities.filter((c) => c.type === 'Город');

	// reactive filtered list
	$: filtered = query
		? cityOptions.filter(
				(c) =>
					c.name.toLowerCase().includes(query.toLowerCase()) ||
					c.name_en?.toLowerCase().includes(query.toLowerCase())
			)
		: cityOptions.slice(0, 20); // limit initial list

	function selectCity(city) {
		value = city.id;
		query = city.name;
		isOpen = false;
	}
</script>

<div class="relative w-full">
	<!-- Input -->
	<input
		bind:value={query}
		onfocus={() => (isOpen = true)}
		oninput={() => (isOpen = true)}
		placeholder="Начните печатать..."
		class="w-full rounded-sm border border-blue-300 bg-gray-50 px-3 py-2 text-blue-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
	/>

	<!-- Dropdown -->
	{#if isOpen && filtered.length > 0}
		<ul
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-blue-300 bg-white shadow"
		>
			{#each filtered as city}
				<li
					class="cursor-pointer px-3 py-2 hover:bg-blue-100"
					onclick={() => selectCity(city)}
				>
					{city.name} ({city.region.name})
				</li>
			{/each}
		</ul>
	{/if}
</div>
