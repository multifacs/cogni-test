<script>
	import cities from './russia-cities.json';

	let value = '';
	export let query = '';
	let isOpen = false;

	// filter only cities with type === "Город"
	const cityOptions = cities.filter((c) => c.type === 'Город');

	// reactive filtered list
	$: filtered = query
		? cityOptions
				.filter(
					(c) =>
						c.name.toLowerCase().includes(query.toLowerCase()) ||
						c.name_en?.toLowerCase().includes(query.toLowerCase())
				)
				.slice(0, 3)
		: cityOptions.slice(0, 3); // limit initial list

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
		onfocusout={() => setTimeout(() => (isOpen = false), 100)}
		placeholder="Начните печатать..."
		class="w-full rounded-sm border px-3 py-2 text-blue-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400"
		class:border-blue-300={query != null}
		class:border-orange-400={query == null}
		class:border-2={query == null}
		class:shadow-[0px_0px_5px_2px_rgba(249,_115,_22,_0.5)]={query == null}
	/>

	<!-- Dropdown -->
	{#if isOpen && filtered.length > 0}
		<ul
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-blue-300 shadow"
		>
			{#each filtered as city}
				<li class="cursor-pointer bg-blue-100 px-3 py-2 text-gray-800">
					<button class="w-full text-left" onclick={() => selectCity(city)}>
						{city.name} ({city.region.name})
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
